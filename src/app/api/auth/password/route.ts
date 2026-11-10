// Invitation/recovery sessions can set a password without trusting client roles.
import { z } from "zod";
import { NextResponse } from "next/server";
import { authClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { api, HttpError, jsonBody } from "@/lib/http";
export const POST = api(async (request: Request) => {
  if (!await getCurrentUser()) throw new HttpError(401, "Unauthorized.");
  const { password } = await jsonBody(request, z.object({ password: z.string().min(12).max(256) }));
  const { error } = await (await authClient()).auth.updateUser({ password });
  if (error) throw new HttpError(400, "Password could not be updated.");
  return NextResponse.json({ ok: true });
});
