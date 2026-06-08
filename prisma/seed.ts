// Phase 2 seed script.
// It creates a small but realistic district, school, user, observation,
// transcript, and insight dataset so future phases have data to display.

import bcrypt from "bcryptjs";
import {
  EvaluationCategory,
  InsightIllustration,
  ObservationStatus,
  PrismaClient,
  SpeakerType,
} from "@prisma/client";

// PrismaClient is the generated TypeScript database client.
const prisma = new PrismaClient();

// All demo users share this password so the auth phase is easy to test later.
const demoPassword = "password123";

// The assignment's six rubric categories become default scores for observations.
const evaluationCategories = [
  EvaluationCategory.CLASSROOM_MANAGEMENT,
  EvaluationCategory.STUDENT_ENGAGEMENT,
  EvaluationCategory.LESSON_PACING,
  EvaluationCategory.INSTRUCTIONAL_CLARITY,
  EvaluationCategory.COMMUNICATION,
  EvaluationCategory.ASSESSMENT_METHODS,
];

// This helper clears tables in dependency order so rerunning the seed is safe.
async function clearExistingData() {
  await prisma.emailLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.transcriptSegment.deleteMany();
  await prisma.transcription.deleteMany();
  await prisma.audioUpload.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.evaluationScore.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  await prisma.district.deleteMany();
}

// This helper gives each observation one score for every rubric category.
function defaultScores() {
  return evaluationCategories.map((category, index) => ({
    category,
    score: [4, 3, 3, 4, 4, 3][index],
    note:
      category === EvaluationCategory.STUDENT_ENGAGEMENT
        ? "Students were active in partner talk, but whole-group discussion used fewer voices."
        : "Evidence observed during the lesson segment.",
  }));
}

async function main() {
  // Start from a clean database every time for predictable demos.
  await clearExistingData();

  // Passwords are hashed now, even though login is a later phase.
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  // The district is the top-level organization in the data model.
  const district = await prisma.district.create({
    data: {
      name: "North Valley District",
    },
  });

  // Two schools make district-level reporting meaningful in later dashboards.
  const lincoln = await prisma.school.create({
    data: {
      name: "Lincoln Middle School",
      districtId: district.id,
    },
  });

  const riverside = await prisma.school.create({
    data: {
      name: "Riverside Elementary",
      districtId: district.id,
    },
  });

  // District admin can eventually see every school and observation.
  const districtAdmin = await prisma.user.create({
    data: {
      name: "Dana Rivera",
      email: "district@example.com",
      passwordHash,
      role: "DISTRICT_ADMIN",
      title: "District Instruction Lead",
      districtId: district.id,
    },
  });

  // School admin can eventually conduct observations for one school.
  const schoolAdmin = await prisma.user.create({
    data: {
      name: "Sam Patel",
      email: "school@example.com",
      passwordHash,
      role: "SCHOOL_ADMIN",
      title: "Assistant Principal",
      districtId: district.id,
      schoolId: lincoln.id,
    },
  });

  // Primary teacher used by the first observation/report demo.
  const teacher = await prisma.user.create({
    data: {
      name: "Maya Chen",
      email: "teacher@example.com",
      passwordHash,
      role: "TEACHER",
      title: "7th Grade Science Teacher",
      districtId: district.id,
      schoolId: lincoln.id,
    },
  });

  // A second teacher helps future dashboards show lists and comparisons.
  await prisma.user.create({
    data: {
      name: "Owen Brooks",
      email: "owen.teacher@example.com",
      passwordHash,
      role: "TEACHER",
      title: "5th Grade Math Teacher",
      districtId: district.id,
      schoolId: riverside.id,
    },
  });

  // This finalized observation contains every child record type in the model.
  const observation = await prisma.observation.create({
    data: {
      title: "Inquiry Lab Discussion",
      subject: "Science",
      gradeLevel: "7",
      status: ObservationStatus.FINALIZED,
      scheduledAt: new Date("2026-05-20T16:00:00.000Z"),
      observedAt: new Date("2026-05-20T16:08:00.000Z"),
      summary:
        "Students investigated heat transfer and used evidence from the lab table to support claims.",
      teacherId: teacher.id,
      observerId: schoolAdmin.id,
      schoolId: lincoln.id,
      districtId: district.id,
      scores: {
        create: defaultScores(),
      },
      feedback: {
        create: {
          authorId: schoolAdmin.id,
          teacherId: teacher.id,
          body: "Strong evidence prompts. Next step: increase wait time after questions so more students can enter the discussion.",
        },
      },
      audioUpload: {
        create: {
          fileName: "sample-classroom-audio.webm",
          mimeType: "audio/webm",
          sizeBytes: 3240000,
          storagePath: "demo/sample-classroom-audio.webm",
        },
      },
      transcription: {
        create: {
          provider: "demo-fallback",
          model: "seeded-transcript",
          text: [
            "Teacher: What evidence tells us heat moved from the cup to the water?",
            "Student 1: The thermometer went up.",
            "Teacher: Good. What do you notice in table two?",
            "Student 2: It changes faster at first.",
            "Teacher: Exactly. Turn to your partner and explain why the rate changes.",
          ].join("\n"),
          segments: {
            create: [
              {
                speakerLabel: "Teacher",
                speakerType: SpeakerType.TEACHER,
                startMs: 0,
                endMs: 8200,
                confidence: 0.94,
                text: "What evidence tells us heat moved from the cup to the water?",
              },
              {
                speakerLabel: "Student 1",
                speakerType: SpeakerType.STUDENT,
                startMs: 8600,
                endMs: 12300,
                confidence: 0.89,
                text: "The thermometer went up.",
              },
              {
                speakerLabel: "Teacher",
                speakerType: SpeakerType.TEACHER,
                startMs: 12700,
                endMs: 21000,
                confidence: 0.92,
                text: "Good. What do you notice in table two?",
              },
              {
                speakerLabel: "Student 2",
                speakerType: SpeakerType.STUDENT,
                startMs: 21600,
                endMs: 26200,
                confidence: 0.88,
                text: "It changes faster at first.",
              },
              {
                speakerLabel: "Teacher",
                speakerType: SpeakerType.TEACHER,
                startMs: 26800,
                endMs: 36800,
                confidence: 0.91,
                text: "Exactly. Turn to your partner and explain why the rate changes.",
              },
            ],
          },
        },
      },
      insight: {
        create: {
          summary:
            "The lesson showed clear evidence-based questioning and positive reinforcement. Student participation increased during partner talk, but whole-group turns were still teacher-led.",
          metricsJson: {
            teacherTalkRatio: 62,
            studentTalkRatio: 38,
            questionCount: 4,
            fillerWordCount: 2,
            positiveReinforcementCount: 2,
            pacingScore: 78,
            clarityScore: 84,
          },
          recommendations: [
            {
              title: "Add three seconds of wait time",
              body: "Pause after evidence questions before calling on a student so more learners can prepare a response.",
              priority: "high",
            },
            {
              title: "Cold-call from partner talk",
              body: "After pairs discuss, invite two less-frequent speakers to share their partner's thinking.",
              priority: "medium",
            },
          ],
          sentimentJson: {
            overall: "supportive",
            positiveMoments: 3,
            correctionMoments: 1,
            confidence: 0.82,
          },
          heatmapJson: [
            { label: "Opening", teacher: 70, students: 30 },
            { label: "Lab talk", teacher: 48, students: 52 },
            { label: "Share-out", teacher: 68, students: 32 },
          ],
          highlightsJson: [
            {
              quote: "What evidence tells us heat moved from the cup to the water?",
              reason: "Strong evidence-based prompt.",
              startMs: 0,
            },
            {
              quote: "Turn to your partner and explain why the rate changes.",
              reason: "Good move toward student-to-student reasoning.",
              startMs: 26800,
            },
          ],
          illustrationKey: InsightIllustration.PATIENCE_CLOCK,
        },
      },
    },
  });

  // A second observation gives future dashboards a scheduled item.
  await prisma.observation.create({
    data: {
      title: "Upcoming Fractions Mini-Lesson",
      subject: "Math",
      gradeLevel: "6",
      status: ObservationStatus.SCHEDULED,
      scheduledAt: new Date("2026-06-02T17:00:00.000Z"),
      teacherId: teacher.id,
      observerId: schoolAdmin.id,
      schoolId: lincoln.id,
      districtId: district.id,
      scores: {
        create: defaultScores().map((score) => ({
          ...score,
          score: 3,
          note: "Baseline score ready for observer evidence.",
        })),
      },
    },
  });

  // Notifications and email logs are seeded now so later phases can display them.
  await prisma.notification.createMany({
    data: [
      {
        userId: teacher.id,
        observationId: observation.id,
        type: "REPORT_READY",
        title: "Observation report ready",
        body: "Your Inquiry Lab Discussion report includes transcript insights and feedback.",
      },
      {
        userId: districtAdmin.id,
        observationId: observation.id,
        type: "DISTRICT_ANALYTICS",
        title: "New finalized observation",
        body: "Lincoln Middle School finalized a science observation with AI-generated insights.",
      },
    ],
  });

  await prisma.emailLog.create({
    data: {
      userId: teacher.id,
      observationId: observation.id,
      email: teacher.email,
      subject: "Your observation report is ready",
      body: "A classroom observation report is available in the teacher dashboard.",
    },
  });

  // Console output confirms that the seed ran and shows credentials for Phase 3.
  console.log("Seed complete");
  console.table([
    { role: "District Admin", email: "district@example.com", password: demoPassword },
    { role: "School Admin", email: "school@example.com", password: demoPassword },
    { role: "Teacher", email: "teacher@example.com", password: demoPassword },
  ]);
}

// Run the seed and always disconnect the database client at the end.
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
