// Phase 5 create-observation API route.
// School admins submit the observation form here. The route validates the
// payload, checks teacher scope, creates rubric scores, and saves feedback.

import {
  ObservationStatus,
  Role,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  parseDateInput,
  parseObservationStatus,
  parseScoreInputs,
  readObservationBody,
  readText,
} from "@/lib/observation-input";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Each role receives only observations inside its allowed scope.
  const where =
    user.role === Role.DISTRICT_ADMIN
      ? { districtId: user.districtId ?? "" }
      : user.role === Role.SCHOOL_ADMIN
        ? { schoolId: user.schoolId ?? "" }
        : { teacherId: user.id };

  const observations = await getDb().observation.findMany({
    where,
    select: {
      id: true,
      title: true,
      subject: true,
      gradeLevel: true,
      status: true,
      scheduledAt: true,
      observedAt: true,
      teacher: {
        select: {
          name: true,
          email: true,
        },
      },
      observer: {
        select: {
          name: true,
          email: true,
        },
      },
      school: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { scheduledAt: "desc" }],
  });

  return NextResponse.json({ observations });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Phase 5 creation is intentionally scoped to school admins.
  if (user.role !== Role.SCHOOL_ADMIN || !user.schoolId || !user.districtId) {
    return NextResponse.json(
      { error: "Only school admins can create observations in Phase 5." },
      { status: 403 }
    );
  }

  const body = await readObservationBody(request);
  const title = readText(body.title);
  const subject = readText(body.subject);
  const gradeLevel = readText(body.gradeLevel);
  const summary = readText(body.summary);
  const feedback = readText(body.feedback);
  const teacherId = readText(body.teacherId);
  const status = parseObservationStatus(body.status, ObservationStatus.SCHEDULED);
  const scheduledAt = parseDateInput(body.scheduledAt);
  const { error: scoreError, scores } = parseScoreInputs(body.scores);

  if (!title || !subject || !gradeLevel || !teacherId) {
    return NextResponse.json(
      { error: "Title, subject, grade, and teacher are required." },
      { status: 400 }
    );
  }

  if (!scheduledAt) {
    return NextResponse.json(
      { error: "Choose a valid observation date." },
      { status: 400 }
    );
  }

  if (scoreError) {
    return NextResponse.json({ error: scoreError }, { status: 400 });
  }

  if (status === ObservationStatus.FINALIZED && !feedback) {
    return NextResponse.json(
      { error: "Finalized reports need written feedback for the teacher." },
      { status: 400 }
    );
  }

  const db = getDb();
  const teacher = await db.user.findUnique({
    where: {
      id: teacherId,
    },
    select: {
      id: true,
      role: true,
      schoolId: true,
      districtId: true,
    },
  });

  if (
    !teacher ||
    teacher.role !== Role.TEACHER ||
    teacher.schoolId !== user.schoolId ||
    teacher.districtId !== user.districtId
  ) {
    return NextResponse.json(
      { error: "Choose a teacher from your school." },
      { status: 403 }
    );
  }

  const observation = await db.observation.create({
    data: {
      title,
      subject,
      gradeLevel,
      status,
      scheduledAt,
      observedAt: status === ObservationStatus.FINALIZED ? scheduledAt : null,
      summary: summary || null,
      teacherId: teacher.id,
      observerId: user.id,
      schoolId: user.schoolId,
      districtId: user.districtId,
      scores: {
        create: scores.map((score) => ({
          category: score.category,
          score: score.score,
          note: score.note || null,
        })),
      },
      feedback: feedback
        ? {
            create: {
              authorId: user.id,
              teacherId: teacher.id,
              body: feedback,
            },
          }
        : undefined,
    },
    select: {
      id: true,
      status: true,
    },
  });

  return NextResponse.json(
    {
      observation,
      redirectPath: `/observations/${observation.id}`,
    },
    { status: 201 }
  );
}
