// Phase 5 single-observation API route.
// GET returns one report if the signed-in user can view it. PATCH lets a school
// admin update the editable Phase 5 fields without bypassing role scope.

import { ObservationStatus, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendReportReadyNotifications } from "@/lib/notifications";
import {
  editableObservationStatuses,
  parseObservationStatus,
  parseScoreInputs,
  readObservationBody,
  readText,
} from "@/lib/observation-input";
import { getObservationReportForUser } from "@/lib/observations";

type ObservationApiRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: ObservationApiRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const observation = await getObservationReportForUser(id, user);

  if (!observation) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }

  return NextResponse.json({ observation });
}

export async function PATCH(request: Request, { params }: ObservationApiRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // In Phase 5, school admins own observation edits. District admins and
  // teachers can read reports but should not mutate them.
  if (user.role !== Role.SCHOOL_ADMIN || !user.schoolId || !user.districtId) {
    return NextResponse.json(
      { error: "Only school admins can update observations in Phase 5." },
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
      status: true,
      scheduledAt: true,
      observedAt: true,
      teacherId: true,
      schoolId: true,
      districtId: true,
      feedback: {
        select: {
          id: true,
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

  const body = await readObservationBody(request);
  const statusWasProvided = body.status !== undefined;
  const summaryWasProvided = body.summary !== undefined;
  const feedback = readText(body.feedback);
  const status = parseObservationStatus(body.status, observation.status);

  if (
    statusWasProvided &&
    !editableObservationStatuses.has(body.status as ObservationStatus)
  ) {
    return NextResponse.json(
      { error: "Status must be SCHEDULED or FINALIZED in Phase 5." },
      { status: 400 }
    );
  }

  const scoreResult =
    body.scores === undefined ? null : parseScoreInputs(body.scores);

  if (scoreResult?.error) {
    return NextResponse.json({ error: scoreResult.error }, { status: 400 });
  }

  if (
    status === ObservationStatus.FINALIZED &&
    !feedback &&
    observation.feedback.length === 0
  ) {
    return NextResponse.json(
      { error: "Finalized reports need written feedback for the teacher." },
      { status: 400 }
    );
  }

  const updated = await db.observation.update({
    where: {
      id: observation.id,
    },
    data: {
      status: statusWasProvided ? status : undefined,
      observedAt:
        statusWasProvided && status === ObservationStatus.FINALIZED
          ? observation.observedAt ?? observation.scheduledAt ?? new Date()
          : undefined,
      summary: summaryWasProvided ? readText(body.summary) || null : undefined,
      scores: scoreResult
        ? {
            upsert: scoreResult.scores.map((score) => ({
              where: {
                observationId_category: {
                  observationId: observation.id,
                  category: score.category,
                },
              },
              update: {
                score: score.score,
                note: score.note || null,
              },
              create: {
                category: score.category,
                score: score.score,
                note: score.note || null,
              },
            })),
          }
        : undefined,
      feedback: feedback
        ? {
            create: {
              authorId: user.id,
              teacherId: observation.teacherId,
              body: feedback,
            },
          }
        : undefined,
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  if (
    statusWasProvided &&
    status === ObservationStatus.FINALIZED &&
    observation.status !== ObservationStatus.FINALIZED
  ) {
    await sendReportReadyNotifications(observation.id);
  }

  return NextResponse.json({ observation: updated });
}
