// School admins call this route after a recording has been uploaded. The shared
// transcript helper owns the OpenAI call, fallback behavior, and status update.

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { generateTranscriptForObservation } from "@/lib/transcripts";

// File transcription reads private Storage bytes, so this route must run in Node.
export const runtime = "nodejs";

type ObservationTranscribeRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: ObservationTranscribeRouteProps
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const result = await generateTranscriptForObservation(id, user);

  if ("error" in result && result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  // Return the source so the client can explain whether the saved transcript
  // came from OpenAI or from the deterministic prototype fallback.
  return NextResponse.json(
    {
      fallbackReason: result.fallbackReason || null,
      source: result.source,
      transcript: result.transcript,
    },
    { status: result.status }
  );
}
