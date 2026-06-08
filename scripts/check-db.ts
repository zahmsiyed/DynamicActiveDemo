// This small script verifies that Phase 2 worked.
// It queries the seeded database and prints counts plus one observation summary.

import { PrismaClient } from "@prisma/client";

// Scripts run outside Next.js, so they can create and close their own client.
const prisma = new PrismaClient();

async function main() {
  // Count the core records that Phase 2 is responsible for creating.
  const [districts, schools, users, observations, transcriptSegments, insights] =
    await Promise.all([
      prisma.district.count(),
      prisma.school.count(),
      prisma.user.count(),
      prisma.observation.count(),
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

  // These logs are intentionally human-readable so the output is useful while learning.
  console.table({
    districts,
    schools,
    users,
    observations,
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
    console.log(`- Has AI insight: ${sampleObservation.insight ? "yes" : "no"}`);
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
