"use client";

// Phase 9 insight generation button.
// The server owns the AI work; this client component only manages the click,
// loading state, and short user-facing result message.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AnalyzeInsightButtonProps = {
  hasInsight: boolean;
  observationId: string;
};

type AnalyzeInsightApiResponse = {
  error?: string;
  fallbackReason?: string | null;
  source?: "openai" | "fallback";
};

function readFallbackMessage(reason: string | null | undefined) {
  if (!reason) {
    return "Fallback insight saved for this prototype run.";
  }

  if (reason === "missing_api_key") {
    return "Fallback insight saved because OPENAI_API_KEY was not available to the server.";
  }

  if (reason.startsWith("openai_error")) {
    return "Fallback insight saved because OpenAI could not generate structured insights for this transcript.";
  }

  return "Fallback insight saved.";
}

export function AnalyzeInsightButton({
  hasInsight,
  observationId,
}: AnalyzeInsightButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setError("");
    setMessage("");

    startTransition(async () => {
      const response = await fetch(
        `/api/observations/${observationId}/analyze`,
        {
          method: "POST",
        }
      );
      const result = (await response.json()) as AnalyzeInsightApiResponse;

      if (!response.ok) {
        setError(result.error ?? "AI insight could not be generated.");
        return;
      }

      setMessage(
        result.source === "openai"
          ? "OpenAI structured insight saved."
          : readFallbackMessage(result.fallbackReason)
      );

      // Refresh reloads the server report so the latest Insight row appears.
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <button
        className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleAnalyze}
        type="button"
      >
        {isPending
          ? "Generating insight..."
          : hasInsight
            ? "Regenerate AI insight"
            : "Generate AI insight"}
      </button>

      {message ? (
        <p className="mt-3 rounded-md border border-lime-300/30 bg-lime-300/10 px-3 py-2 text-sm text-lime-100">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
