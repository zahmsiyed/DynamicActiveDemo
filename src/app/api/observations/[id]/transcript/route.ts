// GET reads the transcript for an allowed observation. POST creates a demo
// fallback transcript for reports that do not have an uploaded recording yet.

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  getObservationTranscriptForUser,
} from "@/lib/transcripts";

type ObservationTranscriptRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ObservationTranscriptRouteProps
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const observation = await getObservationTranscriptForUser(id, user);

  if (!observation) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }

  return NextResponse.json({
    observation: {
      id: observation.id,
      title: observation.title,
    },
    transcript: observation.transcription,
  });
}

// Production never fabricates a transcript when a provider fails.
export async function POST() {
  return NextResponse.json({ error: "Use the evaluation workflow." }, { status: 410 });
}
