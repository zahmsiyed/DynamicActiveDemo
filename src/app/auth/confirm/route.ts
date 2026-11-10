// Email templates point here with token_hash and type; no open redirect input.
import { NextResponse } from "next/server";
import { authClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (token_hash && (type === "invite" || type === "recovery")) {
    const { error } = await (await authClient()).auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL("/account", process.env.APP_ORIGIN || url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=invalid_link", process.env.APP_ORIGIN || url.origin));
}
