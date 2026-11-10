// Revoke the refresh session as well as clearing browser cookies.
import { NextResponse } from "next/server";
import { authClient } from "@/lib/supabase/server";
export async function POST() {
  const { error } = await (await authClient()).auth.signOut();
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 200 });
}
