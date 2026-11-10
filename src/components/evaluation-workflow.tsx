"use client";
// The browser uploads bytes directly to Storage and polls durable server state.
// Only an explicit review submits approved scores; generated values stay advisory.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  analysisSchema,
  categories,
  type Analysis,
} from "@/lib/jobs/contracts";
import { evaluationCategoryLabels } from "@/lib/evaluation";
import {
  audioUploadAcceptAttribute,
  validateAudioUploadFile,
} from "@/lib/media";

type Run = {
  id: string;
  state: string;
  attempts: number;
  errorCode: string | null;
  analysis: Analysis | null;
};
const panel = "rounded-3xl border border-brand-line bg-white p-6";
const button =
  "rounded-full bg-brand-coral px-5 py-3 text-white disabled:opacity-50";
async function send(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "The request could not be completed.");
  return result;
}

export function EvaluationWorkflow({
  observationId,
  finalized,
}: {
  observationId: string;
  finalized: boolean;
}) {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const base = `/api/observations/${observationId}`;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let previous = "";
    async function poll() {
      try {
        const response = await fetch(`${base}/runs`, { cache: "no-store" });
        if (!response.ok)
          throw new Error(
            "Processing status is unavailable. Refresh to try again.",
          );
        const result = await response.json();
        if (cancelled) return;
        setRun(result.run);
        if (result.run?.state === "READY" && previous && previous !== "READY")
          router.refresh();
        previous = result.run?.state || "";
        if (
          !finalized &&
          result.run &&
          !["READY", "FAILED", "SUPERSEDED"].includes(result.run.state)
        )
          timer = setTimeout(poll, 2000);
      } catch (error) {
        if (!cancelled)
          setMessage(
            error instanceof Error ? error.message : "Status unavailable.",
          );
      }
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [base, finalized, revision, router]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const validation = validateAudioUploadFile(
      file instanceof File ? file : null,
    );
    if (!validation.ok || !(file instanceof File)) {
      setMessage(validation.error);
      return;
    }
    setBusy(true);
    setMessage("Uploading recording…");
    try {
      const signed = await send(`${base}/uploads`, {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        authorized: data.get("authorized") === "on",
      });
      // Signed upload URLs authorize this single immutable object, not the bucket.
      const uploaded = await fetch(signed.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploaded.ok)
        throw new Error("Recording upload failed. Please try again.");
      await send(`${base}/uploads/${signed.uploadId}/complete`);
      form.reset();
      setMessage("Recording accepted. Evaluation queued.");
      setRevision((v) => v + 1);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function action(path: string) {
    setBusy(true);
    setMessage("");
    try {
      await send(path);
      setRevision((v) => v + 1);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const parsed = analysisSchema.safeParse(run?.analysis);
  return (
    <section className={panel} aria-label="Evaluation workflow">
      <h2 className="text-xl font-semibold">Evaluation workflow</h2>
      {finalized ? (
        <div className="mt-4">
          <p>This report has been reviewed and finalized.</p>
          <button
            className={`${button} mt-3`}
            disabled={busy}
            onClick={() => action(`${base}/reopen`)}
          >
            Reopen report
          </button>
        </div>
      ) : (
        <>
          <form className="mt-4 grid gap-4" onSubmit={upload}>
            <label>
              Classroom recording
              <input
                className="mt-2 block"
                type="file"
                name="file"
                accept={audioUploadAcceptAttribute}
                required
              />
            </label>
            <p>
              MP3, WAV, MP4, M4A or WebM, up to 25 MB. Uploading starts
              transcription and rubric analysis.
            </p>
            <label className="flex gap-2">
              <input name="authorized" type="checkbox" required />I am
              authorized to upload this classroom recording under my district’s
              policy.
            </label>
            <button className={`${button} w-fit`} disabled={busy}>
              Upload and evaluate
            </button>
          </form>
          {run && (
            <div className="mt-5 rounded-2xl bg-brand-soft p-4">
              <p role="status" data-testid="run-state">
                {run.state === "READY"
                  ? "Ready for review"
                  : run.state.toLowerCase().replaceAll("_", " ")}
              </p>
              {run.state === "FAILED" && (
                <>
                  <p>
                    Processing failed. Your recording is retained according to
                    district policy. You can retry after the issue is resolved.
                  </p>
                  <button
                    className={`${button} mt-3`}
                    disabled={busy}
                    onClick={() => action(`${base}/runs/${run.id}/retry`)}
                  >
                    Retry evaluation
                  </button>
                </>
              )}
            </div>
          )}
          {run?.state === "READY" && parsed.success && (
            <ReviewForm
              key={run.id}
              runId={run.id}
              analysis={parsed.data}
              base={base}
              onSaved={() => router.refresh()}
            />
          )}
        </>
      )}
      {message && (
        <p className="mt-4" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function ReviewForm({
  runId,
  analysis,
  base,
  onSaved,
}: {
  runId: string;
  analysis: Analysis;
  base: string;
  onSaved: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        try {
          await send(`${base}/review`, {
            runId,
            feedback: data.get("feedback"),
            scores: categories.map((category) => ({
              category,
              score: Number(data.get(category)),
              note: String(data.get(`${category}-note`) || ""),
            })),
          });
          setMessage("Report finalized.");
          onSaved();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Review could not be saved.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-lg font-semibold">Review suggested rubric scores</h3>
      <p>
        Check the cited evidence, adjust each score, and add written feedback
        before finalizing.
      </p>
      {analysis.suggestions.map((s) => (
        <fieldset className="rounded-2xl border p-4" key={s.category}>
          <legend>{evaluationCategoryLabels[s.category]}</legend>
          <p>{s.rationale}</p>
          {s.evidence.map((e, i) => (
            <blockquote className="my-2 border-l-2 pl-3" key={i}>
              “{e.quote}”{" "}
              <span className="text-sm">
                (transcript segment {e.segmentIndex + 1})
              </span>
            </blockquote>
          ))}
          {s.score === null && (
            <p>
              Insufficient evidence. Choose a score only after reviewing the
              recording.
            </p>
          )}
          <label>
            Approved score: {evaluationCategoryLabels[s.category]}
            <input
              className="ml-2 w-20 border p-2"
              name={s.category}
              type="number"
              min={1}
              max={5}
              step={1}
              required
              defaultValue={s.score ?? ""}
            />
          </label>
          <label className="mt-2 block">
            Review note: {evaluationCategoryLabels[s.category]}
            <input
              className="ml-2 border p-2"
              name={`${s.category}-note`}
              maxLength={2000}
            />
          </label>
        </fieldset>
      ))}
      <label>
        Written feedback
        <textarea
          name="feedback"
          required
          maxLength={10000}
          className="mt-2 block w-full border p-3"
        />
      </label>
      <button className={`${button} w-fit`} disabled={busy}>
        Finalize reviewed report
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
