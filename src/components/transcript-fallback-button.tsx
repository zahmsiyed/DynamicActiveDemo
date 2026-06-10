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
        className="rounded-full bg-brand-coral px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleCreateTranscript}
        type="button"
      >
        {isPending ? "Creating transcript..." : "Create demo transcript"}
      </button>

      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
