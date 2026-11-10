import { Prisma } from "@prisma/client";
// A tombstone prevents new processing before external Storage deletion starts.
// Failed deletions remain durable and are retried by the next maintenance run.
import { getDb } from "@/lib/db";
import { adminClient } from "@/lib/supabase/admin";
export async function purgeRecording(id: string) {
  const db = getDb();
  const row = await db.recordingVersion.findUnique({
    where: { id },
    include: { observation: true },
  });
  if (!row || row.purgedAt) return true;
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Observation" WHERE id = ${row.observationId} FOR UPDATE`;
    await tx.recordingVersion.update({
      where: { id },
      data: { deletedAt: row.deletedAt ?? new Date() },
    });
    await tx.evaluationRun.updateMany({
      where: {
        recordingId: id,
        state: { in: ["QUEUED", "TRANSCRIBING", "ANALYZING"] },
      },
      data: { state: "SUPERSEDED", leaseToken: null, leaseUntil: null },
    });
    await tx.audioUpload.deleteMany({
      where: { storagePath: row.storagePath },
    });
  });
  // A signed upload capability cannot be revoked per object. Keep the tombstone
  // until its two-hour lifetime (plus clock skew) passes, otherwise an old URL
  // could recreate an object after deletion and escape cleanup tracking.
  if (Date.now() < row.createdAt.getTime() + 2 * 3600_000 + 60_000)
    return false;
  const { error } = await adminClient()
    .storage.from(process.env.SUPABASE_RECORDINGS_BUCKET!)
    .remove([row.storagePath]);
  if (error) throw new Error("storage_deletion_pending");
  await db.$transaction(async (tx) => {
    const changed = await tx.recordingVersion.updateMany({
      where: { id, purgedAt: null },
      data: { purgedAt: new Date() },
    });
    if (changed.count)
      await tx.auditEvent.create({
        data: {
          districtId: row.observation.districtId,
          actorId: "retention-worker",
          action: "RECORDING_PURGED",
          recordId: id,
        },
      });
  });
  return true;
}

export async function deleteObservation(
  id: string,
  districtId: string,
  actorId: string,
) {
  const db = getDb();
  await db.observation.update({
    where: { id },
    data: { deletingAt: new Date() },
  });
  const recordings = await db.recordingVersion.findMany({
    where: { observationId: id },
  });
  let allPurged = true;
  for (const recording of recordings) {
    if (!(await purgeRecording(recording.id))) allPurged = false;
  }
  if (!allPurged) return false;
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Observation" WHERE id = ${id} FOR UPDATE`;
    // No upload is allowed after tombstoning; completed objects are purged above.
    await tx.auditEvent.create({
      data: { districtId, actorId, action: "REPORT_DELETED", recordId: id },
    });
    await tx.observation.delete({ where: { id } });
  });
  return true;
}

export async function maintainRetention() {
  const db = getDb();
  // Pending upload URLs expire after two hours. Reclaim them after that window.
  const expired = await db.recordingVersion.findMany({
    where: {
      purgedAt: null,
      OR: [{ expiresAt: { lt: new Date() } }, { deletedAt: { not: null } }],
    },
    take: 100,
  });
  for (const row of expired) await purgeRecording(row.id);
  const pendingReports = await db.observation.findMany({
    where: { deletingAt: { not: null } },
    take: 100,
  });
  for (const row of pendingReports)
    await deleteObservation(row.id, row.districtId, "retention-worker");
  const districts = await db.district.findMany();
  for (const district of districts) {
    const cutoff = (days: number) => new Date(Date.now() - days * 86400_000);
    if (district.recordingRetentionDays) {
      const rows = await db.recordingVersion.findMany({
        where: {
          purgedAt: null,
          observation: { districtId: district.id },
          completedAt: { lt: cutoff(district.recordingRetentionDays) },
        },
        take: 100,
      });
      for (const row of rows) await purgeRecording(row.id);
    }
    if (district.reportRetentionDays) {
      const reports = await db.observation.findMany({
        where: {
          districtId: district.id,
          createdAt: { lt: cutoff(district.reportRetentionDays) },
        },
        take: 100,
      });
      for (const row of reports)
        await deleteObservation(row.id, district.id, "retention-worker");
    }
    if (district.transcriptRetentionDays) {
      const rows = await db.observation.findMany({
        where: {
          districtId: district.id,
          OR: [
            {
              runs: {
                some: {
                  createdAt: { lt: cutoff(district.transcriptRetentionDays) },
                  transcript: { not: Prisma.DbNull },
                },
              },
            },
            // A revision can outlive a run checkpoint, so scan retained copies
            // independently and anchor expiry to the original source timestamp.
            {
              revisions: {
                some: {
                  sourceCreatedAt: {
                    lt: cutoff(district.transcriptRetentionDays),
                  },
                  snapshot: { path: ["transcript"], not: Prisma.AnyNull },
                },
              },
            },
          ],
        },
        take: 100,
      });
      for (const row of rows)
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Observation" WHERE id = ${row.id} FOR UPDATE`;
          await tx.transcription.deleteMany({
            where: {
              observationId: row.id,
              createdAt: { lt: cutoff(district.transcriptRetentionDays!) },
            },
          });
          // Run checkpoints and published snapshots also contain transcript quotes.
          await tx.evaluationRun.updateMany({
            where: {
              observationId: row.id,
              createdAt: { lt: cutoff(district.transcriptRetentionDays!) },
            },
            data: {
              transcript: Prisma.DbNull,
              analysis: Prisma.DbNull,
              state: "SUPERSEDED",
              leaseToken: null,
              leaseUntil: null,
            },
          });
          await tx.insight.deleteMany({
            where: {
              observationId: row.id,
              createdAt: { lt: cutoff(district.transcriptRetentionDays!) },
            },
          });
          const revisions = await tx.reportRevision.findMany({
            where: {
              observationId: row.id,
              sourceCreatedAt: {
                lt: cutoff(district.transcriptRetentionDays!),
              },
            },
          });
          for (const revision of revisions) {
            const snapshot = revision.snapshot as Record<
              string,
              Prisma.JsonValue
            >;
            await tx.reportRevision.update({
              where: { id: revision.id },
              data: {
                snapshot: { ...snapshot, transcript: null, analysis: null },
              },
            });
          }
          await tx.auditEvent.create({
            data: {
              districtId: district.id,
              actorId: "retention-worker",
              action: "TRANSCRIPT_EXPIRED",
              recordId: row.id,
            },
          });
        });
    }
  }
  await db.requestLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await db.workerHeartbeat.deleteMany({
    where: { seenAt: { lt: new Date(Date.now() - 86400_000) } },
  });
}
