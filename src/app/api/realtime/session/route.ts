// Live transcription preview is retired; durable evaluation uses recording uploads.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { error: "Use recording uploads for evaluation." },
    { status: 410 },
  );
}
