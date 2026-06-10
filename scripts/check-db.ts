// Verify that the local database has the records needed for the demo flow.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Count the core records that the prototype depends on.
  const [
    districts,
    schools,
    users,
    observations,
    audioUploads,
    transcriptions,
    transcriptSegments,
    insights,
  ] = await Promise.all([
      prisma.district.count(),
      prisma.school.count(),
      prisma.user.count(),
      prisma.observation.count(),
      prisma.audioUpload.count(),
      prisma.transcription.count(),
      prisma.transcriptSegment.count(),
      prisma.insight.count(),
    ]);

  // Load one rich observation to prove relationships are connected correctly.
  const sampleObservation = await prisma.observation.findFirst({
    include: {
      teacher: true,
      observer: true,
      school: true,
      scores: true,
      audioUpload: true,
      transcription: {
        include: {
          segments: true,
        },
      },
      insight: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Human-readable output makes this useful before demos and UI debugging.
  console.table({
    districts,
    schools,
    users,
    observations,
    audioUploads,
    transcriptions,
    transcriptSegments,
    insights,
  });

  if (sampleObservation) {
    console.log("\nSample observation:");
    console.log(`- Title: ${sampleObservation.title}`);
    console.log(`- Teacher: ${sampleObservation.teacher.name}`);
    console.log(`- Observer: ${sampleObservation.observer.name}`);
    console.log(`- School: ${sampleObservation.school.name}`);
    console.log(`- Scores: ${sampleObservation.scores.length}`);
    console.log(
      `- Transcript segments: ${sampleObservation.transcription?.segments.length ?? 0}`
    );
    console.log(
      `- Transcript provider: ${sampleObservation.transcription?.provider ?? "none"}`
    );
    console.log(
      `- Audio upload: ${sampleObservation.audioUpload?.fileName ?? "none"}`
    );
    console.log(`- Has AI insight: ${sampleObservation.insight ? "yes" : "no"}`);
    console.log(
      `- Insight illustration: ${sampleObservation.insight?.illustrationKey ?? "none"}`
    );
  }
}

// Always disconnect after a standalone script finishes.
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
