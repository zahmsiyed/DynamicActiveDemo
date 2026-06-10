// School admins upload a classroom recording here. The route validates the
// file, stores it locally for the prototype, saves metadata, and creates the
// final transcript from the stored upload.

import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  persistAudioUploadFile,
  removeStoredAudioUpload,
} from "@/lib/audio-uploads";
import { getDb } from "@/lib/db";
import { generateTranscriptForObservation } from "@/lib/transcripts";

export const runtime = "nodejs";

type ObservationAudioRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: ObservationAudioRouteProps
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== Role.SCHOOL_ADMIN || !user.schoolId || !user.districtId) {
    return NextResponse.json(
      { error: "Only school admins can upload recordings." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const db = getDb();
  const observation = await db.observation.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      teacherId: true,
      schoolId: true,
      districtId: true,
      audioUpload: {
        select: {
          storagePath: true,
        },
      },
    },
  });

  if (
    !observation ||
    observation.schoolId !== user.schoolId ||
    observation.districtId !== user.districtId
  ) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const upload = formData.get("file");

  if (!(upload instanceof File)) {
    return NextResponse.json(
      { error: "Choose an audio or video recording to upload." },
      { status: 400 }
    );
  }

  const storedFile = await persistAudioUploadFile(upload, observation.id);

  if (!storedFile.ok) {
    return NextResponse.json({ error: storedFile.error }, { status: 400 });
  }

  const audioUpload = await db.audioUpload.upsert({
    where: {
      observationId: observation.id,
    },
    update: {
      fileName: storedFile.fileName,
      mimeType: storedFile.mimeType,
      sizeBytes: storedFile.sizeBytes,
      storagePath: storedFile.storagePath,
    },
    create: {
      observationId: observation.id,
      fileName: storedFile.fileName,
      mimeType: storedFile.mimeType,
      sizeBytes: storedFile.sizeBytes,
      storagePath: storedFile.storagePath,
    },
  });

  await removeStoredAudioUpload(observation.audioUpload?.storagePath ?? null);

  // Try OpenAI transcription first and fall back to deterministic transcript
  // data when the key or audio processing path is unavailable.
  const transcriptResult = await generateTranscriptForObservation(observation.id, user);

  if ("error" in transcriptResult && transcriptResult.error) {
    return NextResponse.json(
      { error: transcriptResult.error },
      { status: transcriptResult.status }
    );
  }

  return NextResponse.json(
    {
      audioUpload,
      fallbackReason: transcriptResult.fallbackReason || null,
      source: transcriptResult.source,
      transcript: transcriptResult.transcript,
    },
    { status: 201 }
  );
}
