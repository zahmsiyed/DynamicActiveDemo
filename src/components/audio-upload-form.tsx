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
        <span className="text-sm font-medium text-slate-200">
          Classroom recording
        </span>
        <input
          accept={accept}
          className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-50 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-300 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-950"
          name="file"
          onChange={(event) =>
            setSelectedFileName(event.target.files?.[0]?.name ?? "")
          }
          type="file"
        />
      </label>

      <p className="text-xs leading-5 text-slate-400">
        Accepted: MP3, WAV, MP4, M4A, or WebM. Maximum size: {maxSizeLabel}.
      </p>

      {selectedFileName ? (
        <p className="rounded-md border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
          Selected: {selectedFileName}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <button
        className="w-fit rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Uploading recording..." : "Upload recording"}
      </button>
    </form>
  );
}
