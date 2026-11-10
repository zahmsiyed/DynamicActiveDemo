// Supabase verifies passwords; only provisioned, active application users enter.
import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { roleDashboardPath } from "@/lib/session";
import { api, HttpError, jsonBody, limit } from "@/lib/http";
export const POST = api(async (request: Request) => {
  const { email, password } = await jsonBody(
    request,
    z.object({
      email: z.email().transform((v) => v.toLowerCase()),
      password: z.string().min(1).max(256),
    }),
  );
  await limit(`login:${email}`, 10, 300);
  const client = await authClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  const user = error ? null : await getCurrentUser();
  if (!user) {
    await client.auth.signOut();
    throw new HttpError(401, "Invalid credentials or inactive account.");
  }
  return NextResponse.json({
    user,
    redirectPath: roleDashboardPath(user.role),
  });
});
