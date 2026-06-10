// The browser posts its WebRTC offer SDP here instead of calling OpenAI
// directly. That keeps the real OpenAI API key on the trusted server.

import { createHash } from "crypto";

import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const realtimeCallsUrl = "https://api.openai.com/v1/realtime/calls";

// This is the server-side Realtime configuration sent beside the SDP offer.
// It creates a transcription-only session using OpenAI's live transcription
// model, which streams transcript events back over the WebRTC data channel.
function buildRealtimeTranscriptionSessionConfig() {
  return {
    type: "transcription",
    audio: {
      input: {
        transcription: {
          model: "gpt-realtime-whisper",
          language: "en",
          delay: "low",
        },
      },
    },
  };
}

// The safety identifier should be stable but not expose raw user ids to OpenAI.
function hashUserId(userId: string) {
  return createHash("sha256").update(userId).digest("hex");
}

// OpenAI returns SDP as text on success. Browser callers also send SDP as text,
// so JSON errors are only used for validation and unavailable-service cases.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== Role.SCHOOL_ADMIN || !user.schoolId || !user.districtId) {
    return NextResponse.json(
      { error: "Only school admins can start live transcription." },
      { status: 403 }
    );
  }

  const observationId = new URL(request.url).searchParams.get("observationId");

  if (!observationId) {
    return NextResponse.json(
      { error: "Observation id is required." },
      { status: 400 }
    );
  }

  const observation = await getDb().observation.findUnique({
    where: {
      id: observationId,
    },
    select: {
      id: true,
      districtId: true,
      schoolId: true,
    },
  });

  if (
    !observation ||
    observation.schoolId !== user.schoolId ||
    observation.districtId !== user.districtId
  ) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        code: "missing_api_key",
        error:
          "OPENAI_API_KEY is not configured, so live OpenAI transcription is unavailable.",
      },
      { status: 503 }
    );
  }

  const offerSdp = await request.text();

  if (!offerSdp.trim().startsWith("v=")) {
    return NextResponse.json(
      { error: "A valid SDP offer is required." },
      { status: 400 }
    );
  }

  const formData = new FormData();

  // The Realtime API accepts multipart form data with SDP and a JSON session.
  formData.set("sdp", offerSdp);
  formData.set(
    "session",
    JSON.stringify(buildRealtimeTranscriptionSessionConfig())
  );

  const response = await fetch(realtimeCallsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Safety-Identifier": hashUserId(user.id),
    },
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "OpenAI Realtime session could not be created.",
        detail: responseText,
      },
      { status: response.status }
    );
  }

  return new Response(responseText, {
    status: 200,
    headers: {
      "Content-Type": "application/sdp",
    },
  });
}
