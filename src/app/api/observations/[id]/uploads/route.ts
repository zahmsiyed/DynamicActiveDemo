// Upload directly to a private immutable object, keeping media out of Vercel.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { adminClient } from "@/lib/supabase/admin";
import { editableObservation } from "@/lib/jobs/requests";
import { api, HttpError, jsonBody } from "@/lib/http";
import { acceptedAudioMimeTypes, maxAudioUploadBytes, sanitizeFileName } from "@/lib/media";
export const POST = api(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { user, observation } = await editableObservation(id);
  if (observation.status === "FINALIZED") throw new HttpError(409, "Reopen the report before replacing its recording.");
  const policy = observation.district;
  if (!policy.recordingRetentionDays || !policy.transcriptRetentionDays || !policy.reportRetentionDays) throw new HttpError(409, "Your district must configure retention before uploading.");
  const input = await jsonBody(request, z.object({ fileName: z.string().min(1).max(200), mimeType: z.enum(acceptedAudioMimeTypes), sizeBytes: z.number().int().min(1).max(maxAudioUploadBytes), authorized: z.literal(true) }));
  const storagePath = `${observation.districtId}/${id}/${randomUUID()}/${sanitizeFileName(input.fileName)}`;
  const { data, error } = await adminClient().storage.from(process.env.SUPABASE_RECORDINGS_BUCKET!).createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !data) throw new HttpError(503, "Recording storage unavailable.");
  const upload = await getDb().recordingVersion.create({ data: { observationId: id, storagePath, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, uploadedBy: user.id, authorizedAt: new Date(), policyVersion: policy.policyVersion, expiresAt: new Date(Date.now() + 2 * 3600_000) } });
  return NextResponse.json({ uploadId: upload.id, signedUrl: data.signedUrl }, { status: 201 });
});
