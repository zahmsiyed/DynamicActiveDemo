// These functions read Prisma records and shape them into small dashboard view
// models so components can render without knowing database details.

import { ObservationStatus, Role, type Prisma } from "@prisma/client";

import { getDb } from "@/lib/db";
import { type AppRole } from "@/lib/session";

// Dashboard pages need the same observation relationships repeatedly.
// Keeping the include shape here prevents each page from duplicating it.
const dashboardObservationInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      title: true,
    },
  },
  observer: {
    select: {
      id: true,
      name: true,
      title: true,
    },
  },
  school: {
    select: {
      id: true,
      name: true,
    },
  },
  scores: true,
  feedback: true,
  audioUpload: true,
  transcription: {
    include: {
      segments: true,
    },
  },
  insight: true,
} satisfies Prisma.ObservationInclude;

// This type is the Prisma result after applying the include above.
type DashboardObservationRecord = Prisma.ObservationGetPayload<{
  include: typeof dashboardObservationInclude;
}>;

// Server pages pass the authenticated user into dashboard query helpers.
type DashboardUser = {
  id: string;
  role: AppRole;
  districtId: string | null;
  schoolId: string | null;
};

// This is the simplified observation shape consumed by dashboard tables.
export type DashboardObservation = {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  status: ObservationStatus;
  teacherName: string;
  observerName: string;
  schoolName: string;
  averageScore: number;
  feedbackCount: number;
  hasAudio: boolean;
  hasTranscript: boolean;
  hasInsight: boolean;
  scheduledDate: string;
  updatedDate: string;
};

// These labels keep raw enum values out of visible UI.
export const statusLabels: Record<ObservationStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  RECORDED: "Recorded",
  TRANSCRIBED: "Transcribed",
  ANALYZED: "Analyzed",
  FINALIZED: "Finalized",
};

// The dashboard uses status color as a quick scan cue.
export const statusStyles: Record<ObservationStatus, string> = {
  DRAFT: "border-stone-200 bg-stone-50 text-stone-700",
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-700",
  RECORDED: "border-violet-200 bg-violet-50 text-violet-700",
  TRANSCRIBED: "border-amber-200 bg-amber-50 text-amber-800",
  ANALYZED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FINALIZED: "border-brand-coral/25 bg-brand-soft text-brand-coral-dark",
};

// Format dates in one place so tables stay consistent.
function formatDate(date: Date | null) {
  if (!date) return "Not scheduled";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Compute an observation's rubric average from its evaluation score records.
function averageObservationScore(observation: Pick<DashboardObservationRecord, "scores">) {
  if (!observation.scores.length) return 0;

  const total = observation.scores.reduce((sum, score) => sum + score.score, 0);
  return Number((total / observation.scores.length).toFixed(1));
}

// Convert a Prisma observation into the stable table row shape.
function toDashboardObservation(
  observation: DashboardObservationRecord
): DashboardObservation {
  return {
    id: observation.id,
    title: observation.title,
    subject: observation.subject,
    gradeLevel: observation.gradeLevel,
    status: observation.status,
    teacherName: observation.teacher.name,
    observerName: observation.observer.name,
    schoolName: observation.school.name,
    averageScore: averageObservationScore(observation),
    feedbackCount: observation.feedback.length,
    hasAudio: Boolean(observation.audioUpload),
    hasTranscript: Boolean(observation.transcription),
    hasInsight: Boolean(observation.insight),
    scheduledDate: formatDate(observation.scheduledAt),
    updatedDate: formatDate(observation.updatedAt),
  };
}

// Completion rate means "finalized observations divided by all observations."
function completionRate(observations: DashboardObservationRecord[]) {
  if (!observations.length) return 0;

  const finalized = observations.filter(
    (observation) => observation.status === ObservationStatus.FINALIZED
  ).length;

  return Math.round((finalized / observations.length) * 100);
}

// Average score across all observations that have scores.
function averageScoreAcrossObservations(observations: DashboardObservationRecord[]) {
  const scoredObservations = observations.filter(
    (observation) => observation.scores.length > 0
  );

  if (!scoredObservations.length) return 0;

  const total = scoredObservations.reduce(
    (sum, observation) => sum + averageObservationScore(observation),
    0
  );

  return Number((total / scoredObservations.length).toFixed(1));
}

// Count each status for small dashboard status summaries.
function statusCounts(observations: DashboardObservationRecord[]) {
  return Object.values(ObservationStatus).map((status) => ({
    status,
    label: statusLabels[status],
    count: observations.filter((observation) => observation.status === status).length,
  }));
}

// JSON columns come back as unknown Prisma JSON. This helper safely extracts a
// numeric metric value without trusting the shape blindly.
function readMetric(metricsJson: Prisma.JsonValue | null | undefined, key: string) {
  if (!metricsJson || typeof metricsJson !== "object" || Array.isArray(metricsJson)) {
    return null;
  }

  const value = metricsJson[key as keyof typeof metricsJson];
  return typeof value === "number" ? value : null;
}

// Extract recommendation rows from the seeded AI insight JSON.
function readRecommendations(recommendations: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(recommendations)) return [];

  return recommendations
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const title = item.title;
      const body = item.body;
      const priority = item.priority;

      if (
        typeof title !== "string" ||
        typeof body !== "string" ||
        typeof priority !== "string"
      ) {
        return null;
      }

      return { title, body, priority };
    })
    .filter((item): item is { title: string; body: string; priority: string } =>
      Boolean(item)
    );
}

// District admins need the widest view: all schools, teachers, and observations
// in their district.
export async function getDistrictDashboardData(user: DashboardUser) {
  const db = getDb();
  const districtId = user.districtId ?? "";

  const [schools, teacherCount, schoolAdminCount, observations] = await Promise.all([
    db.school.findMany({
      where: { districtId },
      include: {
        users: {
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            observations: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    db.user.count({
      where: { districtId, role: Role.TEACHER },
    }),
    db.user.count({
      where: { districtId, role: Role.SCHOOL_ADMIN },
    }),
    db.observation.findMany({
      where: { districtId },
      include: dashboardObservationInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return {
    metrics: [
      { label: "Schools", value: schools.length.toString(), detail: "District scope" },
      { label: "Teachers", value: teacherCount.toString(), detail: "Across schools" },
      { label: "School admins", value: schoolAdminCount.toString(), detail: "Managed users" },
      {
        label: "Completion rate",
        value: `${completionRate(observations)}%`,
        detail: "Finalized observations",
      },
      {
        label: "Average score",
        value: averageScoreAcrossObservations(observations).toFixed(1),
        detail: "Rubric average",
      },
      {
        label: "AI insights",
        value: observations.filter((observation) => observation.insight).length.toString(),
        detail: "Generated reports",
      },
    ],
    schools: schools.map((school) => ({
      id: school.id,
      name: school.name,
      teachers: school.users.filter((schoolUser) => schoolUser.role === Role.TEACHER)
        .length,
      admins: school.users.filter((schoolUser) => schoolUser.role === Role.SCHOOL_ADMIN)
        .length,
      observations: school._count.observations,
    })),
    statusCounts: statusCounts(observations),
    observations: observations.map(toDashboardObservation),
  };
}

// School admins need operational queues: upcoming observations, feedback work,
// recording/upload status, and teacher coverage within one school.
export async function getSchoolDashboardData(user: DashboardUser) {
  const db = getDb();
  const schoolId = user.schoolId ?? "";

  const [teachers, observations] = await Promise.all([
    db.user.findMany({
      where: { schoolId, role: Role.TEACHER },
      include: {
        observedLessons: {
          include: dashboardObservationInclude,
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    db.observation.findMany({
      where: { schoolId },
      include: dashboardObservationInclude,
      orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  const upcoming = observations.filter(
    (observation) => observation.status === ObservationStatus.SCHEDULED
  );
  const reportsNeedingWork = observations.filter(
    (observation) => observation.status !== ObservationStatus.FINALIZED
  );

  return {
    metrics: [
      { label: "Teachers", value: teachers.length.toString(), detail: "In this school" },
      { label: "Upcoming", value: upcoming.length.toString(), detail: "Scheduled evals" },
      {
        label: "Feedback queue",
        value: reportsNeedingWork.length.toString(),
        detail: "Not finalized",
      },
      {
        label: "Recordings",
        value: observations.filter((observation) => observation.audioUpload).length.toString(),
        detail: "Uploaded audio",
      },
      {
        label: "Transcripts",
        value: observations.filter((observation) => observation.transcription).length.toString(),
        detail: "Ready to review",
      },
      {
        label: "Average score",
        value: averageScoreAcrossObservations(observations).toFixed(1),
        detail: "School rubric average",
      },
    ],
    teacherRows: teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      title: teacher.title ?? "Teacher",
      observations: teacher.observedLessons.length,
      averageScore: averageScoreAcrossObservations(teacher.observedLessons),
      latestStatus:
        teacher.observedLessons[0]?.status ? statusLabels[teacher.observedLessons[0].status] : "No observations",
    })),
    upcoming: upcoming.map(toDashboardObservation),
    statusCounts: statusCounts(observations),
    observations: observations.map(toDashboardObservation),
  };
}

// Teachers need a personal view: latest reports, feedback, AI suggestions, and
// growth signals from their own observation history.
export async function getTeacherDashboardData(user: DashboardUser) {
  const db = getDb();

  const observations = await db.observation.findMany({
    where: { teacherId: user.id },
    include: dashboardObservationInclude,
    orderBy: [{ observedAt: "desc" }, { scheduledAt: "desc" }, { updatedAt: "desc" }],
  });

  const finalized = observations.filter(
    (observation) => observation.status === ObservationStatus.FINALIZED
  );
  const latestObservation = observations[0] ?? null;
  const latestInsightObservation =
    observations.find((observation) => observation.insight) ?? null;
  const latestMetrics = latestInsightObservation?.insight
    ? latestInsightObservation.insight.metricsJson
    : null;

  return {
    metrics: [
      { label: "Reports", value: observations.length.toString(), detail: "All observations" },
      {
        label: "Finalized",
        value: finalized.length.toString(),
        detail: "Ready to review",
      },
      {
        label: "Latest score",
        value: latestObservation
          ? averageObservationScore(latestObservation).toFixed(1)
          : "0.0",
        detail: "Most recent observation",
      },
      {
        label: "Feedback notes",
        value: observations
          .reduce((sum, observation) => sum + observation.feedback.length, 0)
          .toString(),
        detail: "From administrators",
      },
      {
        label: "Student talk",
        value: `${readMetric(latestMetrics, "studentTalkRatio") ?? 0}%`,
        detail: "Latest AI insight",
      },
      {
        label: "Clarity score",
        value: `${readMetric(latestMetrics, "clarityScore") ?? 0}`,
        detail: "Latest AI insight",
      },
    ],
    latestSummary:
      latestInsightObservation?.insight?.summary ??
      "No AI summary is available yet. It will appear here after a transcript is analyzed.",
    recommendations: readRecommendations(
      latestInsightObservation?.insight?.recommendations
    ),
    feedback: observations.flatMap((observation) =>
      observation.feedback.map((feedback) => ({
        id: feedback.id,
        observationTitle: observation.title,
        body: feedback.body,
        createdDate: formatDate(feedback.createdAt),
      }))
    ),
    observations: observations.map(toDashboardObservation),
  };
}
