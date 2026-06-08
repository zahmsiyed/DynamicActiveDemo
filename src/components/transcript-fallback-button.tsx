"use client";

// Phase 6 fallback transcript button.
// This client component owns the click/loading/error state for creating a demo
// transcript, while the transcript list itself can stay server-rendered.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TranscriptFallbackButtonProps = {
  observationId: string;
};

export function TranscriptFallbackButton({
  observationId,
}: TranscriptFallbackButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreateTranscript() {
    setError("");

    startTransition(async () => {
      const response = await fetch(
        `/api/observations/${observationId}/transcript`,
        {
          method: "POST",
        }
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Transcript could not be created.");
        return;
      }

      // Refresh reloads the server report page so the new segments appear.
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <button
        className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleCreateTranscript}
        type="button"
      >
        {isPending ? "Creating transcript..." : "Create demo transcript"}
      </button>

      {error ? (
        <p className="mt-3 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
