// Always return the same response so recovery cannot enumerate accounts.
import { z } from "zod";
import { NextResponse } from "next/server";
import { authClient } from "@/lib/supabase/server";
import { api, jsonBody, limit } from "@/lib/http";
export const POST = api(async (request: Request) => {
  const { email } = await jsonBody(request, z.object({ email: z.email() }));
  await limit(`recovery:${email.toLowerCase()}`, 3, 3600);
  await (await authClient()).auth.resetPasswordForEmail(email);
  return NextResponse.json({ ok: true });
});
