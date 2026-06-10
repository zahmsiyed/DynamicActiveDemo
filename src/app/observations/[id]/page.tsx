// Phase 5 observation report page.
// This page is shared by all roles, but data access is checked before rendering:
// district admins see district reports, school admins see school reports, and
// teachers see only reports attached to their own user account.

import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyzeInsightButton } from "@/components/analyze-insight-button";
import { AudioUploadForm } from "@/components/audio-upload-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatusBadge } from "@/components/dashboard-widgets";
import { InsightPanel } from "@/components/insight-panel";
import { RealtimeRecorder } from "@/components/realtime-recorder";
import { TranscribeButton } from "@/components/transcribe-button";
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
import { readInsightView } from "@/lib/insight-view";
import { getObservationReportForUser } from "@/lib/observations";
import { roleDashboardPath } from "@/lib/session";

const panelClass =
  "rounded-[1.5rem] border border-brand-line bg-brand-card p-5 shadow-sm";
const compactCardClass =
  "rounded-[1.25rem] border border-brand-line bg-white p-4";
const secondaryLinkClass =
  "rounded-full border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-coral hover:text-brand-coral";
const primaryLinkClass =
  "rounded-full bg-brand-coral px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark";

type ObservationReportPageProps = {
  params: Promise<{
    id: string;
  }>;
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
  const insightView = readInsightView(observation.insight);
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
          className={secondaryLinkClass}
          href={dashboardPath}
        >
          Back to dashboard
        </Link>

        <Link
          className={secondaryLinkClass}
          href={`/api/observations/${observation.id}/report.pdf`}
          target="_blank"
        >
          Export PDF
        </Link>

        {user.role === "SCHOOL_ADMIN" ? (
          <Link
            className={primaryLinkClass}
            href="/observations/new"
          >
            Create another observation
          </Link>
        ) : null}
      </div>

      <section className={panelClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-ink">
              Report summary
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">
              {observation.summary ??
                "No narrative summary has been added to this observation yet."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={observation.status} />
            <span className="rounded-full border border-brand-line bg-brand-soft px-3 py-2 font-mono text-sm font-semibold text-brand-ink">
              {reportAverage.toFixed(1)} avg
            </span>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={compactCardClass}>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
              Teacher
            </dt>
            <dd className="mt-2 text-sm font-semibold text-brand-ink">
              {observation.teacher.name}
            </dd>
            <dd className="mt-1 text-xs text-brand-muted">
              {observation.teacher.title ?? observation.teacher.email}
            </dd>
          </div>

          <div className={compactCardClass}>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
              Observer
            </dt>
            <dd className="mt-2 text-sm font-semibold text-brand-ink">
              {observation.observer.name}
            </dd>
            <dd className="mt-1 text-xs text-brand-muted">
              {observation.observer.title ?? observation.observer.email}
            </dd>
          </div>

          <div className={compactCardClass}>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
              Class
            </dt>
            <dd className="mt-2 text-sm font-semibold text-brand-ink">
              {observation.subject}
            </dd>
            <dd className="mt-1 text-xs text-brand-muted">
              Grade {observation.gradeLevel}
            </dd>
          </div>

          <div className={compactCardClass}>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
              Date
            </dt>
            <dd className="mt-2 text-sm font-semibold text-brand-ink">
              {formatDate(observedDate)}
            </dd>
            <dd className="mt-1 text-xs text-brand-muted">
              {observation.school.name}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[1.5rem] border border-brand-line bg-brand-card shadow-sm">
        <div className="border-b border-brand-line px-5 py-4">
          <h2 className="font-semibold text-brand-ink">Rubric scores</h2>
        </div>

        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {orderedScores.map((score) => (
            <article
              key={score.category}
              className="rounded-[1.25rem] border border-brand-line bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-ink">
                    {evaluationCategoryLabels[score.category]}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-brand-muted">
                    {evaluationCategoryDescriptions[score.category]}
                  </p>
                </div>
                <span className="rounded-full bg-brand-coral px-2.5 py-1 font-mono text-sm font-semibold text-white">
                  {score.score}/5
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-brand-muted">
                {score.note || "No evidence note was added for this category."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <section className={panelClass}>
          <h2 className="font-semibold text-brand-ink">Written feedback</h2>
          <div className="mt-4 space-y-3">
            {observation.feedback.length ? (
              observation.feedback.map((feedback) => (
                <article
                  key={feedback.id}
                  className="rounded-[1.25rem] border border-brand-line bg-white p-4"
                >
                  <p className="text-sm leading-6 text-brand-muted">
                    {feedback.body}
                  </p>
                  <p className="mt-3 text-xs text-brand-muted">
                    {feedback.author.name}
                    {feedback.author.title ? `, ${feedback.author.title}` : ""}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-brand-muted">
                Feedback has not been written for this observation yet.
              </p>
            )}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="font-semibold text-brand-ink">Workflow readiness</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
              <p className="font-semibold text-brand-ink">Audio upload</p>
              <p className="mt-1 text-brand-muted">
                {observation.audioUpload
                  ? `${observation.audioUpload.fileName} (${formatUploadSize(
                      observation.audioUpload.sizeBytes
                    )})`
                  : "No recording uploaded yet."}
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
              <p className="font-semibold text-brand-ink">Transcript</p>
              <p className="mt-1 text-brand-muted">
                {observation.transcription
                  ? `${observation.transcription.segments.length} timestamped segments stored.`
                  : "No transcript stored yet."}
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
              <p className="font-semibold text-brand-ink">AI insight</p>
              <p className="mt-1 text-brand-muted">
                {observation.insight
                  ? `Insight available: ${observation.insight.illustrationKey}.`
                  : "No AI insight generated yet."}
              </p>
            </div>
          </div>
        </section>
      </div>

      {user.role === "SCHOOL_ADMIN" ? (
        <RealtimeRecorder
          maxSizeLabel={maxUploadSizeLabel}
          observationId={observation.id}
        />
      ) : null}

      <section className={panelClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-brand-ink">Recording upload</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">
              Attach an existing classroom recording to this observation.
              Phase 8 sends the stored file to OpenAI for diarized
              speech-to-text when an API key is available, then falls back to
              demo transcript data when the live path cannot run.
            </p>
          </div>

          {observation.audioUpload ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Recording attached
            </span>
          ) : (
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
              No recording
            </span>
          )}
        </div>

        {observation.audioUpload ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={compactCardClass}>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
                File
              </dt>
              <dd className="mt-2 break-words text-sm font-semibold text-brand-ink">
                {observation.audioUpload.fileName}
              </dd>
            </div>

            <div className={compactCardClass}>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
                Type
              </dt>
              <dd className="mt-2 font-mono text-sm text-brand-ink">
                {observation.audioUpload.mimeType}
              </dd>
            </div>

            <div className={compactCardClass}>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
                Size
              </dt>
              <dd className="mt-2 font-mono text-sm text-brand-ink">
                {formatUploadSize(observation.audioUpload.sizeBytes)}
              </dd>
            </div>

            <div className={compactCardClass}>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
                Storage
              </dt>
              <dd className="mt-2 break-words font-mono text-xs text-brand-muted">
                {observation.audioUpload.storagePath ?? "metadata only"}
              </dd>
            </div>
          </dl>
        ) : null}

        {user.role === "SCHOOL_ADMIN" && observation.audioUpload ? (
          <TranscribeButton
            hasTranscript={Boolean(observation.transcription)}
            observationId={observation.id}
          />
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
        canCreateFallback={
          user.role === "SCHOOL_ADMIN" && !observation.audioUpload
        }
        highlightedStartMs={insightView?.highlightStartMs ?? []}
        observationId={observation.id}
        transcription={observation.transcription}
      />

      <section className={panelClass}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-brand-ink">AI analysis</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">
              Phase 9 turns the stored transcript into structured coaching data:
              summary, metrics, sentiment, recommendations, heatmap, and
              transcript highlights.
            </p>
          </div>

          <span className="w-fit rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-coral-dark">
            {observation.transcription ? "Transcript ready" : "Needs transcript"}
          </span>
        </div>

        {user.role === "SCHOOL_ADMIN" && observation.transcription ? (
          <AnalyzeInsightButton
            hasInsight={Boolean(observation.insight)}
            observationId={observation.id}
          />
        ) : null}
      </section>

      <InsightPanel insight={insightView} />
    </DashboardShell>
  );
}
