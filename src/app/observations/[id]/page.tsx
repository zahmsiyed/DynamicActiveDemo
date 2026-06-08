// Phase 5 observation report page.
// This page is shared by all roles, but data access is checked before rendering:
// district admins see district reports, school admins see school reports, and
// teachers see only reports attached to their own user account.

import { type Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AudioUploadForm } from "@/components/audio-upload-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatusBadge } from "@/components/dashboard-widgets";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { requireCurrentUser } from "@/lib/auth";
import {
  audioUploadAcceptAttribute,
  formatUploadSize,
  maxAudioUploadBytes,
} from "@/lib/audio-uploads";
import {
  averageScore,
  evaluationCategories,
  evaluationCategoryDescriptions,
  evaluationCategoryLabels,
} from "@/lib/evaluation";
import { getObservationReportForUser } from "@/lib/observations";
import { roleDashboardPath } from "@/lib/session";

type ObservationReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Recommendation = {
  title: string;
  body: string;
  priority: string;
};

// Dates are formatted in one helper so the report stays visually consistent.
function formatDate(date: Date | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Prisma JSON is typed as unknown data, so we validate recommendation rows
// before rendering them in the report.
function readRecommendations(
  recommendations: Prisma.JsonValue | null | undefined
): Recommendation[] {
  if (!Array.isArray(recommendations)) return [];

  return recommendations
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;

      const record = item as Record<string, unknown>;
      const title = record.title;
      const body = record.body;
      const priority = record.priority;

      if (
        typeof title !== "string" ||
        typeof body !== "string" ||
        typeof priority !== "string"
      ) {
        return null;
      }

      return { title, body, priority };
    })
    .filter((item): item is Recommendation => Boolean(item));
}

// Insight metrics also come from JSON. This helper reads only safe primitive
// values and avoids trusting the stored JSON shape blindly.
function readMetric(metrics: Prisma.JsonValue | null | undefined, key: string) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return null;
  }

  const record = metrics as Record<string, unknown>;
  const value = record[key];
  return typeof value === "number" || typeof value === "string" ? value : null;
}

export default async function ObservationReportPage({
  params,
}: ObservationReportPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const observation = await getObservationReportForUser(id, user);

  if (!observation) {
    notFound();
  }

  const dashboardPath = roleDashboardPath(user.role);
  const observedDate = observation.observedAt ?? observation.scheduledAt;
  const reportAverage = averageScore(observation.scores);
  const scoresByCategory = new Map(
    observation.scores.map((score) => [score.category, score])
  );
  const orderedScores = evaluationCategories
    .map((category) => scoresByCategory.get(category))
    .filter((score): score is NonNullable<typeof score> => Boolean(score));
  const recommendations = readRecommendations(observation.insight?.recommendations);
  const maxUploadSizeLabel = formatUploadSize(maxAudioUploadBytes);

  return (
    <DashboardShell
      user={user}
      eyebrow="Observation report"
      title={observation.title}
      description="Review the observation record, rubric evidence, written coaching feedback, and workflow status for the classroom report."
    >
      <div className="flex flex-wrap gap-2">
        <Link
          className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-300/60 hover:text-white"
          href={dashboardPath}
        >
          Back to dashboard
        </Link>

        {user.role === "SCHOOL_ADMIN" ? (
          <Link
            className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/20"
            href="/observations/new"
          >
            Create another observation
          </Link>
        ) : null}
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Report summary</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {observation.summary ??
                "No narrative summary has been added to this observation yet."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={observation.status} />
            <span className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 font-mono text-sm text-white">
              {reportAverage.toFixed(1)} avg
            </span>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Teacher
            </dt>
            <dd className="mt-2 text-sm font-medium text-white">
              {observation.teacher.name}
            </dd>
            <dd className="mt-1 text-xs text-slate-400">
              {observation.teacher.title ?? observation.teacher.email}
            </dd>
          </div>

          <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Observer
            </dt>
            <dd className="mt-2 text-sm font-medium text-white">
              {observation.observer.name}
            </dd>
            <dd className="mt-1 text-xs text-slate-400">
              {observation.observer.title ?? observation.observer.email}
            </dd>
          </div>

          <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Class
            </dt>
            <dd className="mt-2 text-sm font-medium text-white">
              {observation.subject}
            </dd>
            <dd className="mt-1 text-xs text-slate-400">
              Grade {observation.gradeLevel}
            </dd>
          </div>

          <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Date
            </dt>
            <dd className="mt-2 text-sm font-medium text-white">
              {formatDate(observedDate)}
            </dd>
            <dd className="mt-1 text-xs text-slate-400">
              {observation.school.name}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Rubric scores</h2>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {orderedScores.map((score) => (
            <article
              key={score.category}
              className="rounded-md border border-white/10 bg-slate-900/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-white">
                    {evaluationCategoryLabels[score.category]}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {evaluationCategoryDescriptions[score.category]}
                  </p>
                </div>
                <span className="rounded-md bg-cyan-300 px-2.5 py-1 font-mono text-sm font-semibold text-slate-950">
                  {score.score}/5
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                {score.note || "No evidence note was added for this category."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h2 className="font-semibold text-white">Written feedback</h2>
          <div className="mt-4 space-y-3">
            {observation.feedback.length ? (
              observation.feedback.map((feedback) => (
                <article
                  key={feedback.id}
                  className="rounded-md border border-white/10 bg-slate-900/70 p-3"
                >
                  <p className="text-sm leading-6 text-slate-300">
                    {feedback.body}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    {feedback.author.name}
                    {feedback.author.title ? `, ${feedback.author.title}` : ""}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                Feedback has not been written for this observation yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h2 className="font-semibold text-white">Workflow readiness</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-md bg-slate-900/70 p-3">
              <p className="font-medium text-white">Audio upload</p>
              <p className="mt-1 text-slate-400">
                {observation.audioUpload
                  ? `${observation.audioUpload.fileName} (${formatUploadSize(
                      observation.audioUpload.sizeBytes
                    )})`
                  : "No recording uploaded yet."}
              </p>
            </div>

            <div className="rounded-md bg-slate-900/70 p-3">
              <p className="font-medium text-white">Transcript</p>
              <p className="mt-1 text-slate-400">
                {observation.transcription
                  ? `${observation.transcription.segments.length} timestamped segments stored.`
                  : "No transcript stored yet."}
              </p>
            </div>

            <div className="rounded-md bg-slate-900/70 p-3">
              <p className="font-medium text-white">AI insight</p>
              <p className="mt-1 text-slate-400">
                {observation.insight
                  ? `Insight available: ${observation.insight.illustrationKey}.`
                  : "No AI insight generated yet."}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-white">Recording upload</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Attach the classroom recording to this observation. Phase 7 stores
              the local file and metadata, then creates a fallback transcript so
              the report can move forward without real AI transcription yet.
            </p>
          </div>

          {observation.audioUpload ? (
            <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-100">
              Recording attached
            </span>
          ) : (
            <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-200">
              No recording
            </span>
          )}
        </div>

        {observation.audioUpload ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                File
              </dt>
              <dd className="mt-2 break-words text-sm font-medium text-white">
                {observation.audioUpload.fileName}
              </dd>
            </div>

            <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Type
              </dt>
              <dd className="mt-2 font-mono text-sm text-white">
                {observation.audioUpload.mimeType}
              </dd>
            </div>

            <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Size
              </dt>
              <dd className="mt-2 font-mono text-sm text-white">
                {formatUploadSize(observation.audioUpload.sizeBytes)}
              </dd>
            </div>

            <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Storage
              </dt>
              <dd className="mt-2 break-words font-mono text-xs text-slate-300">
                {observation.audioUpload.storagePath ?? "metadata only"}
              </dd>
            </div>
          </dl>
        ) : null}

        {user.role === "SCHOOL_ADMIN" ? (
          <AudioUploadForm
            accept={audioUploadAcceptAttribute}
            maxSizeLabel={maxUploadSizeLabel}
            observationId={observation.id}
          />
        ) : null}
      </section>

      <TranscriptViewer
        canCreateFallback={user.role === "SCHOOL_ADMIN"}
        observationId={observation.id}
        transcription={observation.transcription}
      />

      {observation.insight ? (
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h2 className="font-semibold text-white">Seeded insight preview</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            {observation.insight.summary}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Student talk", readMetric(observation.insight.metricsJson, "studentTalkRatio")],
              ["Teacher talk", readMetric(observation.insight.metricsJson, "teacherTalkRatio")],
              ["Questions", readMetric(observation.insight.metricsJson, "questionCount")],
            ].map(([label, value]) => (
              <div
                key={label?.toString()}
                className="rounded-md border border-white/10 bg-slate-900/70 p-3"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 font-mono text-lg text-white">
                  {value ?? "n/a"}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {recommendations.map((recommendation) => (
              <article
                key={recommendation.title}
                className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium text-cyan-50">
                    {recommendation.title}
                  </h3>
                  <span className="rounded-full border border-cyan-300/30 px-2 py-0.5 text-xs uppercase text-cyan-100">
                    {recommendation.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-cyan-50/85">
                  {recommendation.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
