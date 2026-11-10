// Signed download links are short-lived and issued only after record checks.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { observationScope } from "@/lib/access";
import { api, HttpError } from "@/lib/http";
import { adminClient } from "@/lib/supabase/admin";
export const GET = api(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Unauthorized.");
  const row = await getDb().observation.findFirst({ where: { id, ...observationScope(user) }, include: { audioUpload: true } });
  if (!row?.audioUpload?.storagePath) throw new HttpError(404, "Recording not found.");
  const { data, error } = await adminClient().storage.from(process.env.SUPABASE_RECORDINGS_BUCKET!).createSignedUrl(row.audioUpload.storagePath, 60);
  if (error || !data) throw new HttpError(503, "Recording unavailable.");
  return NextResponse.json({ url: data.signedUrl });
});
