// Seed a realistic district-wide demo dataset for all three role dashboards.

import bcrypt from "bcryptjs";
import {
  EvaluationCategory,
  InsightIllustration,
  ObservationStatus,
  Prisma,
  PrismaClient,
  SpeakerType,
  type User,
} from "@prisma/client";

const prisma = new PrismaClient();

// All demo users share this password so role-based login is easy to test.
const demoPassword = "password123";

const evaluationCategories = [
  EvaluationCategory.CLASSROOM_MANAGEMENT,
  EvaluationCategory.STUDENT_ENGAGEMENT,
  EvaluationCategory.LESSON_PACING,
  EvaluationCategory.INSTRUCTIONAL_CLARITY,
  EvaluationCategory.COMMUNICATION,
  EvaluationCategory.ASSESSMENT_METHODS,
];

type ScoreSet = Partial<Record<EvaluationCategory, number>>;
type NoteSet = Partial<Record<EvaluationCategory, string>>;

type SegmentInput = {
  speakerLabel: string;
  speakerType: SpeakerType;
  startMs: number;
  endMs: number;
  confidence: number;
  text: string;
};

type InsightInput = {
  summary: string;
  metrics: Prisma.InputJsonObject;
  recommendations: Prisma.InputJsonArray;
  sentiment: Prisma.InputJsonObject;
  heatmap: Prisma.InputJsonArray;
  highlights: Prisma.InputJsonArray;
  illustrationKey: InsightIllustration;
};

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

function scoreRows(scores: ScoreSet, notes: NoteSet = {}) {
  return evaluationCategories.map((category) => ({
    category,
    score: scores[category] ?? 3,
    note:
      notes[category] ??
      "Evidence is ready for calibration during the coaching conversation.",
  }));
}

function transcriptText(segments: SegmentInput[]) {
  return segments
    .map((segment) => `${segment.speakerLabel}: ${segment.text}`)
    .join("\n");
}

function studentDiscussionSegments(): SegmentInput[] {
  return [
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 0,
      endMs: 7600,
      confidence: 0.94,
      text: "Before we solve, what evidence tells us heat moved from the cup to the water?",
    },
    {
      speakerLabel: "Student 1",
      speakerType: SpeakerType.STUDENT,
      startMs: 8100,
      endMs: 12400,
      confidence: 0.9,
      text: "The thermometer went up after the cup touched the water.",
    },
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 13000,
      endMs: 20600,
      confidence: 0.92,
      text: "Good. What do you notice in the second table, and how does it support your claim?",
    },
    {
      speakerLabel: "Student 2",
      speakerType: SpeakerType.STUDENT,
      startMs: 21400,
      endMs: 26600,
      confidence: 0.88,
      text: "It changes faster at first, then it slows down.",
    },
    {
      speakerLabel: "Group",
      speakerType: SpeakerType.GROUP,
      startMs: 27500,
      endMs: 35500,
      confidence: 0.84,
      text: "Students compare notes and point to the graph on their lab sheet.",
    },
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 36400,
      endMs: 46200,
      confidence: 0.91,
      text: "Exactly. Turn to your partner and explain why the rate changes using one sentence of evidence.",
    },
  ];
}

function seminarSegments(): SegmentInput[] {
  return [
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 0,
      endMs: 6200,
      confidence: 0.93,
      text: "Which claim is strongest, and what evidence makes you say that?",
    },
    {
      speakerLabel: "Student 1",
      speakerType: SpeakerType.STUDENT,
      startMs: 7100,
      endMs: 13800,
      confidence: 0.89,
      text: "The second claim is stronger because it uses the data from both trials.",
    },
    {
      speakerLabel: "Student 2",
      speakerType: SpeakerType.STUDENT,
      startMs: 14400,
      endMs: 21800,
      confidence: 0.87,
      text: "I agree, but I think the first one explains the pattern more clearly.",
    },
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 22600,
      endMs: 31500,
      confidence: 0.92,
      text: "Great comparison. Can someone build on that by naming the exact evidence?",
    },
    {
      speakerLabel: "Group",
      speakerType: SpeakerType.GROUP,
      startMs: 32400,
      endMs: 41400,
      confidence: 0.83,
      text: "Several students reference the data table and annotate their written claim.",
    },
  ];
}

function readingConferenceSegments(): SegmentInput[] {
  return [
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 0,
      endMs: 6800,
      confidence: 0.92,
      text: "Show me where the character's choice changes the direction of the story.",
    },
    {
      speakerLabel: "Student 1",
      speakerType: SpeakerType.STUDENT,
      startMs: 7300,
      endMs: 12900,
      confidence: 0.88,
      text: "Here, because she decides to tell the truth instead of hiding the letter.",
    },
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 13600,
      endMs: 22600,
      confidence: 0.91,
      text: "Nice text evidence. What does that reveal about the character?",
    },
    {
      speakerLabel: "Student 2",
      speakerType: SpeakerType.STUDENT,
      startMs: 23500,
      endMs: 30500,
      confidence: 0.86,
      text: "She is nervous, but she wants people to trust her.",
    },
  ];
}

function geometrySegments(): SegmentInput[] {
  return [
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 0,
      endMs: 8400,
      confidence: 0.93,
      text: "What theorem lets us justify this angle relationship?",
    },
    {
      speakerLabel: "Student 1",
      speakerType: SpeakerType.STUDENT,
      startMs: 9100,
      endMs: 14100,
      confidence: 0.89,
      text: "The alternate interior angles theorem.",
    },
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 14800,
      endMs: 24800,
      confidence: 0.92,
      text: "Exactly. Now write the reason beside step three before you continue.",
    },
    {
      speakerLabel: "Group",
      speakerType: SpeakerType.GROUP,
      startMs: 25500,
      endMs: 34000,
      confidence: 0.84,
      text: "Students revise proofs and compare the reasons listed with a partner.",
    },
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 35000,
      endMs: 43000,
      confidence: 0.9,
      text: "Good precision. If your proof has a missing reason, pause and add it now.",
    },
  ];
}

function scienceInquiryInsight(): InsightInput {
  return {
    summary:
      "The lesson showed clear evidence-based questioning and positive reinforcement. Student participation increased during partner talk, while whole-group turns still depended heavily on teacher prompts.",
    metrics: {
      teacherTalkRatio: 57,
      studentTalkRatio: 43,
      questionCount: 4,
      fillerWordCount: 1,
      positiveReinforcementCount: 3,
      pacingScore: 82,
      clarityScore: 86,
      pacingNotes:
        "Pacing supported pair processing, with one opportunity to extend wait time before selecting a speaker.",
    },
    recommendations: [
      {
        title: "Protect wait time after evidence prompts",
        body: "Pause for three to five seconds after the first evidence question so more students can prepare a complete response.",
        priority: "high",
      },
      {
        title: "Transfer one prompt to students",
        body: "After partner talk, ask one student to invite a peer to add evidence instead of routing every turn through the teacher.",
        priority: "medium",
      },
    ],
    sentiment: {
      overall: "supportive",
      positiveMoments: 3,
      correctionMoments: 0,
      confidence: 0.86,
    },
    heatmap: [
      { label: "Opening", teacher: 65, students: 35 },
      { label: "Partner talk", teacher: 42, students: 58 },
      { label: "Share-out", teacher: 63, students: 37 },
    ],
    highlights: [
      {
        quote:
          "What evidence tells us heat moved from the cup to the water?",
        reason: "Strong evidence-based prompt that anchors student reasoning.",
        startMs: 0,
      },
      {
        quote:
          "Turn to your partner and explain why the rate changes using one sentence of evidence.",
        reason: "Clear move that shifts cognitive work to students.",
        startMs: 36400,
      },
    ],
    illustrationKey: InsightIllustration.PATIENCE_CLOCK,
  };
}

function seminarInsight(): InsightInput {
  return {
    summary:
      "Student-to-student reasoning was visible during the seminar. The strongest opportunity is to make participation more balanced by naming discussion roles and returning to quieter students after partner rehearsal.",
    metrics: {
      teacherTalkRatio: 39,
      studentTalkRatio: 61,
      questionCount: 2,
      fillerWordCount: 2,
      positiveReinforcementCount: 2,
      pacingScore: 88,
      clarityScore: 79,
      pacingNotes:
        "The lesson allowed extended student talk; clarity would improve with a sharper mid-discussion synthesis.",
    },
    recommendations: [
      {
        title: "Add a midpoint synthesis",
        body: "Pause halfway through discussion to capture two strong evidence moves before students continue.",
        priority: "medium",
      },
      {
        title: "Balance who enters the seminar",
        body: "Use partner rehearsal to invite quieter students into the next whole-group round.",
        priority: "high",
      },
    ],
    sentiment: {
      overall: "supportive",
      positiveMoments: 2,
      correctionMoments: 0,
      confidence: 0.8,
    },
    heatmap: [
      { label: "Opening", teacher: 54, students: 46 },
      { label: "Discussion", teacher: 28, students: 72 },
      { label: "Synthesis", teacher: 44, students: 56 },
    ],
    highlights: [
      {
        quote: "The second claim is stronger because it uses the data from both trials.",
        reason: "Student explains a claim by citing evidence.",
        startMs: 7100,
      },
      {
        quote: "Can someone build on that by naming the exact evidence?",
        reason: "Teacher prompt pushes students from agreement toward evidence.",
        startMs: 22600,
      },
    ],
    illustrationKey: InsightIllustration.PARTICIPATION_BALANCE,
  };
}

function geometryInsight(): InsightInput {
  return {
    summary:
      "The proof workshop had precise academic language and strong procedural clarity. Students used theorem names accurately, and the next step is to add more independent checks before teacher confirmation.",
    metrics: {
      teacherTalkRatio: 59,
      studentTalkRatio: 41,
      questionCount: 1,
      fillerWordCount: 0,
      positiveReinforcementCount: 3,
      pacingScore: 76,
      clarityScore: 91,
      pacingNotes:
        "Teacher explanations were concise, but students could own more of the proof-checking routine.",
    },
    recommendations: [
      {
        title: "Ask students to verify before confirming",
        body: "Before naming the theorem, have pairs check whether the angle relationship meets the theorem conditions.",
        priority: "medium",
      },
      {
        title: "Use a proof checklist",
        body: "Give students a three-step checklist for statement, reason, and dependency to increase independent revision.",
        priority: "low",
      },
    ],
    sentiment: {
      overall: "supportive",
      positiveMoments: 3,
      correctionMoments: 0,
      confidence: 0.84,
    },
    heatmap: [
      { label: "Model", teacher: 69, students: 31 },
      { label: "Partner proof", teacher: 36, students: 64 },
      { label: "Revision", teacher: 58, students: 42 },
    ],
    highlights: [
      {
        quote: "What theorem lets us justify this angle relationship?",
        reason: "Question checks conceptual grounding before procedural work.",
        startMs: 0,
      },
      {
        quote: "Students revise proofs and compare the reasons listed with a partner.",
        reason: "Peer comparison gives students ownership of proof revision.",
        startMs: 25500,
      },
    ],
    illustrationKey: InsightIllustration.CLARITY_STEPS,
  };
}

async function seedReportReadyActivity({
  districtAdmins,
  observationId,
  schoolName,
  teacher,
  title,
}: {
  districtAdmins: Pick<User, "id">[];
  observationId: string;
  schoolName: string;
  teacher: Pick<User, "id" | "email" | "name">;
  title: string;
}) {
  await prisma.notification.create({
    data: {
      userId: teacher.id,
      observationId,
      type: "REPORT_READY",
      title: "Observation report ready",
      body: `${title} is ready with scoring, feedback, transcript evidence, and AI coaching details.`,
    },
  });

  await prisma.emailLog.create({
    data: {
      userId: teacher.id,
      observationId,
      email: teacher.email,
      subject: "Your observation report is ready",
      body: `${title} has been finalized for ${schoolName}. Review the report in your teacher dashboard.`,
    },
  });

  await prisma.notification.createMany({
    data: districtAdmins.map((admin) => ({
      userId: admin.id,
      observationId,
      type: "DISTRICT_REPORT_READY",
      title: "New finalized observation",
      body: `${schoolName} finalized ${title} for ${teacher.name}.`,
    })),
  });
}

async function main() {
  await clearExistingData();

  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const district = await prisma.district.create({
    data: {
      name: "North Valley District",
    },
  });

  const [lincoln, riverside, cedarGrove] = await Promise.all([
    prisma.school.create({
      data: {
        name: "Lincoln Middle School",
        districtId: district.id,
      },
    }),
    prisma.school.create({
      data: {
        name: "Riverside Elementary",
        districtId: district.id,
      },
    }),
    prisma.school.create({
      data: {
        name: "Cedar Grove High School",
        districtId: district.id,
      },
    }),
  ]);

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

  const cedarAdmin = await prisma.user.create({
    data: {
      name: "Alex Morgan",
      email: "cedar.admin@example.com",
      passwordHash,
      role: "SCHOOL_ADMIN",
      title: "Dean of Instruction",
      districtId: district.id,
      schoolId: cedarGrove.id,
    },
  });

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

  const owen = await prisma.user.create({
    data: {
      name: "Owen Brooks",
      email: "owen.teacher@example.com",
      passwordHash,
      role: "TEACHER",
      title: "6th Grade Humanities Teacher",
      districtId: district.id,
      schoolId: lincoln.id,
    },
  });

  const elena = await prisma.user.create({
    data: {
      name: "Elena Garcia",
      email: "elena.teacher@example.com",
      passwordHash,
      role: "TEACHER",
      title: "4th Grade Math Teacher",
      districtId: district.id,
      schoolId: riverside.id,
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: "Priya Nair",
      email: "priya.teacher@example.com",
      passwordHash,
      role: "TEACHER",
      title: "High School Geometry Teacher",
      districtId: district.id,
      schoolId: cedarGrove.id,
    },
  });

  const inquirySegments = studentDiscussionSegments();
  const inquiryInsight = scienceInquiryInsight();
  const inquiryObservation = await prisma.observation.create({
    data: {
      title: "Inquiry Lab Discussion",
      subject: "Science",
      gradeLevel: "7",
      status: ObservationStatus.FINALIZED,
      scheduledAt: new Date("2026-05-20T16:00:00.000Z"),
      observedAt: new Date("2026-05-20T16:08:00.000Z"),
      summary:
        "Students investigated heat transfer and used evidence from lab tables to support claims during partner and whole-group discussion.",
      teacherId: teacher.id,
      observerId: schoolAdmin.id,
      schoolId: lincoln.id,
      districtId: district.id,
      scores: {
        create: scoreRows(
          {
            CLASSROOM_MANAGEMENT: 4,
            STUDENT_ENGAGEMENT: 4,
            LESSON_PACING: 4,
            INSTRUCTIONAL_CLARITY: 4,
            COMMUNICATION: 5,
            ASSESSMENT_METHODS: 4,
          },
          {
            STUDENT_ENGAGEMENT:
              "Partner talk increased participation, with a next step of drawing more voices into share-out.",
            COMMUNICATION:
              "Prompts consistently pushed students to name evidence before making claims.",
          }
        ),
      },
      feedback: {
        create: {
          authorId: schoolAdmin.id,
          teacherId: teacher.id,
          body: "Strong evidence prompts and clear redirection to student reasoning. Next step: extend wait time before selecting the first speaker.",
        },
      },
      audioUpload: {
        create: {
          fileName: "inquiry-lab-discussion.webm",
          mimeType: "audio/webm",
          sizeBytes: 3240000,
          storagePath: "demo/inquiry-lab-discussion.webm",
        },
      },
      transcription: {
        create: {
          provider: "demo-fallback",
          model: "seeded-transcript",
          text: transcriptText(inquirySegments),
          segments: {
            create: inquirySegments,
          },
        },
      },
      insight: {
        create: {
          summary: inquiryInsight.summary,
          metricsJson: inquiryInsight.metrics,
          recommendations: inquiryInsight.recommendations,
          sentimentJson: inquiryInsight.sentiment,
          heatmapJson: inquiryInsight.heatmap,
          highlightsJson: inquiryInsight.highlights,
          illustrationKey: inquiryInsight.illustrationKey,
        },
      },
    },
  });

  const seminarSegmentsList = seminarSegments();
  const claimsInsight = seminarInsight();
  await prisma.observation.create({
    data: {
      title: "Claims and Evidence Seminar",
      subject: "Science",
      gradeLevel: "7",
      status: ObservationStatus.ANALYZED,
      scheduledAt: new Date("2026-05-29T18:00:00.000Z"),
      observedAt: new Date("2026-05-29T18:05:00.000Z"),
      summary:
        "Students compared written claims and practiced using precise evidence from two trials.",
      teacherId: teacher.id,
      observerId: schoolAdmin.id,
      schoolId: lincoln.id,
      districtId: district.id,
      scores: {
        create: scoreRows(
          {
            CLASSROOM_MANAGEMENT: 4,
            STUDENT_ENGAGEMENT: 5,
            LESSON_PACING: 4,
            INSTRUCTIONAL_CLARITY: 3,
            COMMUNICATION: 4,
            ASSESSMENT_METHODS: 3,
          },
          {
            STUDENT_ENGAGEMENT:
              "Students built on peer ideas and used evidence during discussion.",
            INSTRUCTIONAL_CLARITY:
              "A midpoint synthesis would help students track the strongest claims.",
          }
        ),
      },
      feedback: {
        create: {
          authorId: schoolAdmin.id,
          teacherId: teacher.id,
          body: "Student voice was strong in the seminar. Add a brief synthesis checkpoint so students leave with a clear model of the strongest evidence.",
        },
      },
      audioUpload: {
        create: {
          fileName: "claims-evidence-seminar.webm",
          mimeType: "audio/webm",
          sizeBytes: 2860000,
          storagePath: "demo/claims-evidence-seminar.webm",
        },
      },
      transcription: {
        create: {
          provider: "demo-fallback",
          model: "seeded-transcript",
          text: transcriptText(seminarSegmentsList),
          segments: {
            create: seminarSegmentsList,
          },
        },
      },
      insight: {
        create: {
          summary: claimsInsight.summary,
          metricsJson: claimsInsight.metrics,
          recommendations: claimsInsight.recommendations,
          sentimentJson: claimsInsight.sentiment,
          heatmapJson: claimsInsight.heatmap,
          highlightsJson: claimsInsight.highlights,
          illustrationKey: claimsInsight.illustrationKey,
        },
      },
    },
  });

  await prisma.observation.create({
    data: {
      title: "Upcoming Fractions Mini-Lesson",
      subject: "Math",
      gradeLevel: "6",
      status: ObservationStatus.SCHEDULED,
      scheduledAt: new Date("2026-06-18T17:00:00.000Z"),
      teacherId: teacher.id,
      observerId: schoolAdmin.id,
      schoolId: lincoln.id,
      districtId: district.id,
      scores: {
        create: scoreRows(
          {
            CLASSROOM_MANAGEMENT: 3,
            STUDENT_ENGAGEMENT: 3,
            LESSON_PACING: 3,
            INSTRUCTIONAL_CLARITY: 3,
            COMMUNICATION: 3,
            ASSESSMENT_METHODS: 3,
          },
          {
            CLASSROOM_MANAGEMENT:
              "Baseline row for the scheduled pre-observation plan.",
            ASSESSMENT_METHODS:
              "Observer will collect evidence from exit ticket checks.",
          }
        ),
      },
    },
  });

  const readingSegments = readingConferenceSegments();
  await prisma.observation.create({
    data: {
      title: "Reading Conference Rotation",
      subject: "Humanities",
      gradeLevel: "6",
      status: ObservationStatus.TRANSCRIBED,
      scheduledAt: new Date("2026-06-04T15:30:00.000Z"),
      observedAt: new Date("2026-06-04T15:35:00.000Z"),
      summary:
        "Small-group reading conferences focused on citing text evidence and explaining character motivation.",
      teacherId: owen.id,
      observerId: schoolAdmin.id,
      schoolId: lincoln.id,
      districtId: district.id,
      scores: {
        create: scoreRows(
          {
            CLASSROOM_MANAGEMENT: 4,
            STUDENT_ENGAGEMENT: 3,
            LESSON_PACING: 3,
            INSTRUCTIONAL_CLARITY: 4,
            COMMUNICATION: 4,
            ASSESSMENT_METHODS: 3,
          },
          {
            STUDENT_ENGAGEMENT:
              "Conference groups were focused, but whole-class sharing was limited.",
            ASSESSMENT_METHODS:
              "Teacher gathered reading evidence verbally; written tracking would strengthen follow-up.",
          }
        ),
      },
      feedback: {
        create: {
          authorId: schoolAdmin.id,
          teacherId: owen.id,
          body: "Conferences surfaced specific text evidence. Next step: capture one written note per student so feedback can be tracked over time.",
        },
      },
      audioUpload: {
        create: {
          fileName: "reading-conference-rotation.m4a",
          mimeType: "audio/m4a",
          sizeBytes: 1960000,
          storagePath: "demo/reading-conference-rotation.m4a",
        },
      },
      transcription: {
        create: {
          provider: "demo-fallback",
          model: "seeded-transcript",
          text: transcriptText(readingSegments),
          segments: {
            create: readingSegments,
          },
        },
      },
    },
  });

  await prisma.observation.create({
    data: {
      title: "Number Talk Warmup",
      subject: "Math",
      gradeLevel: "4",
      status: ObservationStatus.RECORDED,
      scheduledAt: new Date("2026-06-05T16:30:00.000Z"),
      observedAt: new Date("2026-06-05T16:32:00.000Z"),
      summary:
        "Students shared mental math strategies during a short number talk warmup.",
      teacherId: elena.id,
      observerId: districtAdmin.id,
      schoolId: riverside.id,
      districtId: district.id,
      scores: {
        create: scoreRows(
          {
            CLASSROOM_MANAGEMENT: 4,
            STUDENT_ENGAGEMENT: 4,
            LESSON_PACING: 3,
            INSTRUCTIONAL_CLARITY: 3,
            COMMUNICATION: 4,
            ASSESSMENT_METHODS: 3,
          },
          {
            LESSON_PACING:
              "Warmup launched quickly; transitions after strategy share need review.",
            INSTRUCTIONAL_CLARITY:
              "Student strategies were named, but criteria for efficient strategies could be clearer.",
          }
        ),
      },
      audioUpload: {
        create: {
          fileName: "number-talk-warmup.wav",
          mimeType: "audio/wav",
          sizeBytes: 2480000,
          storagePath: "demo/number-talk-warmup.wav",
        },
      },
    },
  });

  await prisma.observation.create({
    data: {
      title: "AP Biology Lab Safety",
      subject: "Biology",
      gradeLevel: "10",
      status: ObservationStatus.DRAFT,
      scheduledAt: new Date("2026-06-24T19:00:00.000Z"),
      teacherId: priya.id,
      observerId: cedarAdmin.id,
      schoolId: cedarGrove.id,
      districtId: district.id,
      scores: {
        create: scoreRows(
          {
            CLASSROOM_MANAGEMENT: 3,
            STUDENT_ENGAGEMENT: 3,
            LESSON_PACING: 3,
            INSTRUCTIONAL_CLARITY: 4,
            COMMUNICATION: 3,
            ASSESSMENT_METHODS: 3,
          },
          {
            INSTRUCTIONAL_CLARITY:
              "Pre-observation plan includes clear safety expectations and lab role cards.",
          }
        ),
      },
    },
  });

  const geometrySegmentsList = geometrySegments();
  const geometryInsightData = geometryInsight();
  const geometryObservation = await prisma.observation.create({
    data: {
      title: "Geometry Proof Workshop",
      subject: "Geometry",
      gradeLevel: "9",
      status: ObservationStatus.FINALIZED,
      scheduledAt: new Date("2026-05-23T18:30:00.000Z"),
      observedAt: new Date("2026-05-23T18:35:00.000Z"),
      summary:
        "Students revised proof statements and matched theorem reasons with increasing precision.",
      teacherId: priya.id,
      observerId: cedarAdmin.id,
      schoolId: cedarGrove.id,
      districtId: district.id,
      scores: {
        create: scoreRows(
          {
            CLASSROOM_MANAGEMENT: 4,
            STUDENT_ENGAGEMENT: 4,
            LESSON_PACING: 3,
            INSTRUCTIONAL_CLARITY: 5,
            COMMUNICATION: 4,
            ASSESSMENT_METHODS: 4,
          },
          {
            INSTRUCTIONAL_CLARITY:
              "Teacher modeled theorem language precisely and students applied it during proof revision.",
            LESSON_PACING:
              "A few teacher confirmations came before students had time to verify independently.",
          }
        ),
      },
      feedback: {
        create: {
          authorId: cedarAdmin.id,
          teacherId: priya.id,
          body: "Academic vocabulary was precise and students revised proofs productively. Add one independent verification step before confirming theorem choices.",
        },
      },
      audioUpload: {
        create: {
          fileName: "geometry-proof-workshop.webm",
          mimeType: "audio/webm",
          sizeBytes: 3010000,
          storagePath: "demo/geometry-proof-workshop.webm",
        },
      },
      transcription: {
        create: {
          provider: "demo-fallback",
          model: "seeded-transcript",
          text: transcriptText(geometrySegmentsList),
          segments: {
            create: geometrySegmentsList,
          },
        },
      },
      insight: {
        create: {
          summary: geometryInsightData.summary,
          metricsJson: geometryInsightData.metrics,
          recommendations: geometryInsightData.recommendations,
          sentimentJson: geometryInsightData.sentiment,
          heatmapJson: geometryInsightData.heatmap,
          highlightsJson: geometryInsightData.highlights,
          illustrationKey: geometryInsightData.illustrationKey,
        },
      },
    },
  });

  await seedReportReadyActivity({
    districtAdmins: [districtAdmin],
    observationId: inquiryObservation.id,
    schoolName: lincoln.name,
    teacher,
    title: inquiryObservation.title,
  });

  await seedReportReadyActivity({
    districtAdmins: [districtAdmin],
    observationId: geometryObservation.id,
    schoolName: cedarGrove.name,
    teacher: priya,
    title: geometryObservation.title,
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: schoolAdmin.id,
        observationId: inquiryObservation.id,
        type: "TRANSCRIPT_READY",
        title: "Transcript ready for review",
        body: "Inquiry Lab Discussion has timestamped transcript evidence ready for coaching review.",
      },
      {
        userId: schoolAdmin.id,
        observationId: inquiryObservation.id,
        type: "INSIGHT_READY",
        title: "AI insight generated",
        body: "Inquiry Lab Discussion includes participation metrics, highlights, and recommendations.",
      },
      {
        userId: districtAdmin.id,
        observationId: geometryObservation.id,
        type: "DISTRICT_ANALYTICS",
        title: "Cross-school report activity",
        body: "Cedar Grove High School added a finalized geometry report with AI coaching data.",
      },
    ],
  });

  console.log("Seed complete");
  console.table([
    { role: "District Admin", email: "district@example.com", password: demoPassword },
    { role: "School Admin", email: "school@example.com", password: demoPassword },
    { role: "Teacher", email: "teacher@example.com", password: demoPassword },
  ]);
  console.table({
    district: district.name,
    schools: 3,
    users: 7,
    observations: 7,
    finalizedReports: 2,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
