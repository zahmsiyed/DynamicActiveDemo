// These helpers keep file validation and Supabase Storage persistence out of
// the route handler so the upload rules are easy to audit.

import { randomUUID } from "crypto";

import {
  removeRecordingObject,
  uploadRecordingObject,
} from "@/lib/supabase-storage";

import { hasFileExtension, validateAudioUploadFile, hasExpectedAudioContainerSignature, sanitizeFileName, type PersistedAudioUploadResult } from "@/lib/media";
export { acceptedAudioMimeTypes, maxAudioUploadBytes, audioUploadAcceptAttribute, formatUploadSize, hasExpectedAudioContainerSignature } from "@/lib/media";

export async function persistAudioUploadFile(
  file: File,
  observationId: string
): Promise<PersistedAudioUploadResult> {
  const validation = validateAudioUploadFile(file);

  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
    };
  }

  const safeOriginalName = sanitizeFileName(file.name);
  const extension = validation.extension;
  const storedFileName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
  const finalFileName = hasFileExtension(storedFileName)
    ? storedFileName
    : `${storedFileName}.${extension}`;
  const storagePath = ["observations", observationId, finalFileName].join("/");
  const bytes = Buffer.from(await file.arrayBuffer());

  if (!hasExpectedAudioContainerSignature(bytes, validation.mimeType)) {
    return {
      ok: false,
      error:
        "The selected file does not look like a valid MP3, WAV, MP4, M4A, or WebM recording.",
    };
  }

  try {
    await uploadRecordingObject({
      bytes,
      contentType: validation.mimeType,
      storagePath,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Recording could not be stored in Supabase Storage.",
    };
  }

  return {
    ok: true,
    error: "",
    fileName: file.name || finalFileName,
    mimeType: validation.mimeType,
    sizeBytes: file.size,
    storagePath,
  };
}

// Remove a previously uploaded object when replacing an observation upload.
export async function removeStoredAudioUpload(storagePath: string | null) {
  await removeRecordingObject(storagePath);
}
