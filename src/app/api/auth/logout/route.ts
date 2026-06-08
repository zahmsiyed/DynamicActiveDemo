// Phase 3 logout API route.
// Logging out is just deleting the session cookie from the browser.

import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
  });

  // Deleting the cookie makes future protected route requests unauthenticated.
  response.cookies.delete(SESSION_COOKIE);

  return response;
}
