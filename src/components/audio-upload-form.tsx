"use client";

// Phase 7 audio upload form.
// The server report page passes validation hints down, while this client
// component owns the selected file, loading state, and form submission.

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type AudioUploadFormProps = {
  accept: string;
  maxSizeLabel: string;
  observationId: string;
};

export function AudioUploadForm({
  accept,
  maxSizeLabel,
  observationId,
}: AudioUploadFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/observations/${observationId}/audio`, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Recording could not be uploaded.");
        return;
      }

      form.reset();
      setSelectedFileName("");
      router.refresh();
    });
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-semibold text-brand-ink">
          Classroom recording
        </span>
        <input
          accept={accept}
          className="mt-2 w-full rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm text-brand-ink file:mr-3 file:rounded-full file:border-0 file:bg-brand-coral file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white focus:border-brand-coral focus:outline-none focus:ring-4 focus:ring-brand-coral/10"
          name="file"
          onChange={(event) =>
            setSelectedFileName(event.target.files?.[0]?.name ?? "")
          }
          type="file"
        />
      </label>

      <p className="text-xs leading-5 text-brand-muted">
        Accepted: MP3, WAV, MP4, M4A, or WebM. Maximum size: {maxSizeLabel}.
      </p>

      {selectedFileName ? (
        <p className="rounded-2xl border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand-muted">
          Selected: {selectedFileName}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        className="w-fit rounded-full bg-brand-coral px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Uploading recording..." : "Upload recording"}
      </button>
    </form>
  );
}
