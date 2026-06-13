// Supabase Storage access stays server-only because it uses the service-role
// key, which can bypass normal user policies and must never reach the browser.

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type StorageConfig = {
  bucket: string;
  serviceRoleKey: string;
  url: string;
};

type StorageBytesResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      bytes: Buffer;
    };

let cachedClient: SupabaseClient | null = null;
let ensuredBucketName: string | null = null;

function missingStorageEnvError(missingKeys: string[]) {
  return `storage_not_configured: Missing ${missingKeys.join(
    ", "
  )}. Set Supabase Storage environment variables before uploading recordings.`;
}

function readStorageConfig(): StorageConfig {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_RECORDINGS_BUCKET?.trim();
  const missingKeys = [
    !rawUrl ? "SUPABASE_URL" : "",
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : "",
    !bucket ? "SUPABASE_RECORDINGS_BUCKET" : "",
  ].filter(Boolean);

  if (!rawUrl || !serviceRoleKey || !bucket) {
    throw new Error(missingStorageEnvError(missingKeys));
  }

  const url = new URL(rawUrl).origin;

  return {
    bucket,
    serviceRoleKey,
    url,
  };
}

function getSupabaseStorageClient() {
  const config = readStorageConfig();

  if (!cachedClient) {
    cachedClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return {
    bucket: config.bucket,
    client: cachedClient,
  };
}

// Create the private recordings bucket on first use when the service key has
// permission to manage Storage. Existing buckets are reused.
async function ensureRecordingsBucket() {
  const { bucket, client } = getSupabaseStorageClient();

  if (ensuredBucketName === bucket) {
    return;
  }

  const { error: readError } = await client.storage.getBucket(bucket);

  if (!readError) {
    ensuredBucketName = bucket;
    return;
  }

  const { error: createError } = await client.storage.createBucket(bucket, {
    public: false,
  });

  if (createError) {
    const message = createError.message.toLowerCase();

    if (!message.includes("already exists")) {
      throw new Error(
        `storage_bucket_unavailable: ${createError.message}`
      );
    }
  }

  ensuredBucketName = bucket;
}

export async function uploadRecordingObject({
  bytes,
  contentType,
  storagePath,
}: {
  bytes: Buffer;
  contentType: string;
  storagePath: string;
}) {
  await ensureRecordingsBucket();

  const { bucket, client } = getSupabaseStorageClient();
  const { error } = await client.storage.from(bucket).upload(storagePath, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`storage_upload_failed: ${error.message}`);
  }
}

export async function downloadRecordingObject(
  storagePath: string | null
): Promise<StorageBytesResult> {
  if (!storagePath) {
    return {
      ok: false,
      error: "missing_storage_path",
    };
  }

  try {
    const { bucket, client } = getSupabaseStorageClient();
    const { data, error } = await client.storage.from(bucket).download(storagePath);

    if (error) {
      return {
        ok: false,
        error: `storage_download_failed: ${error.message}`,
      };
    }

    return {
      ok: true,
      bytes: Buffer.from(await data.arrayBuffer()),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "storage_download_failed",
    };
  }
}

export async function removeRecordingObject(storagePath: string | null) {
  if (!storagePath) return;

  try {
    const { bucket, client } = getSupabaseStorageClient();
    await client.storage.from(bucket).remove([storagePath]);
  } catch {
    // Missing old objects or temporary Storage errors should not block replacing
    // database metadata for a new upload.
  }
}
