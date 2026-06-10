// This route is useful for testing the session and for client components that
// need to know who is signed in.

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        user: null,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user,
  });
}
