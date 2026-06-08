// Phase 7 audio upload helpers.
// These helpers keep file validation and local-disk storage out of the route
// handler so the upload rules are easy to audit.

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

// Keep the prototype upload limit modest so route handlers do not load huge
// files into memory. Production would stream to object storage instead.
export const maxAudioUploadBytes = 25 * 1024 * 1024;

// Phase 7 accepts common classroom audio/video container types.
export const acceptedAudioMimeTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
] as const;

const acceptedExtensionsByMimeType: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

type AudioUploadValidationResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      error: "";
      extension: string;
      mimeType: string;
    };

type PersistedAudioUploadResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      error: "";
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      storagePath: string;
    };

// This string is passed to the browser file input.
export const audioUploadAcceptAttribute = acceptedAudioMimeTypes.join(",");

// Display bytes in a human-readable way for reports and validation messages.
export function formatUploadSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Keep stored filenames predictable and safe for local filesystem paths.
function sanitizeFileName(fileName: string) {
  return (
    fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "classroom-recording"
  );
}

// Normalize browser-provided MIME types before validation.
function normalizeMimeType(mimeType: string) {
  return mimeType.trim().toLowerCase();
}

// Validate a browser File before reading or writing its bytes.
export function validateAudioUploadFile(
  file: File | null
): AudioUploadValidationResult {
  if (!file) {
    return {
      ok: false,
      error: "Choose an audio or video recording to upload.",
    };
  }

  if (file.size <= 0) {
    return { ok: false, error: "The selected file is empty." };
  }

  if (file.size > maxAudioUploadBytes) {
    return {
      ok: false,
      error: `Recording must be ${formatUploadSize(maxAudioUploadBytes)} or smaller.`,
    };
  }

  const mimeType = normalizeMimeType(file.type);

  if (!acceptedExtensionsByMimeType[mimeType]) {
    return {
      ok: false,
      error: "Upload an MP3, WAV, MP4, M4A, or WebM recording.",
    };
  }

  return {
    ok: true,
    error: "",
    extension: acceptedExtensionsByMimeType[mimeType],
    mimeType,
  };
}

// Save the upload to a local ignored directory and return metadata for Prisma.
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
  const storedFileName = `${Date.now()}-${safeOriginalName}`;
  const finalFileName = path.extname(storedFileName)
    ? storedFileName
    : `${storedFileName}.${extension}`;
  const storagePath = [
    ".uploads",
    "observations",
    observationId,
    finalFileName,
  ].join("/");
  const storageDirectory = path.join(
    process.cwd(),
    ".uploads",
    "observations",
    observationId
  );
  const fullPath = path.join(storageDirectory, finalFileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(storageDirectory, { recursive: true });
  await writeFile(fullPath, bytes);

  return {
    ok: true,
    error: "",
    fileName: file.name || finalFileName,
    mimeType: validation.mimeType,
    sizeBytes: file.size,
    storagePath,
  };
}

// Remove a previously uploaded local file when replacing an observation upload.
// The path guard prevents this helper from deleting anything outside .uploads.
export async function removeStoredAudioUpload(storagePath: string | null) {
  if (!storagePath) return;

  const uploadRoot = path.resolve(process.cwd(), ".uploads");
  const filePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), storagePath);

  if (!filePath.startsWith(uploadRoot)) return;

  try {
    await unlink(filePath);
  } catch {
    // Missing old files should not block replacing metadata in the prototype.
  }
}
