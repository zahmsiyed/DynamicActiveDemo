// Creation schedules an unscored evaluation. Approved scores are written only
// by the review endpoint, never by creation or a background worker.
import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { observationScope } from "@/lib/access";
import { getDb } from "@/lib/db";
import { api, HttpError, jsonBody, limit } from "@/lib/http";
export const GET = api(async (request: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Unauthorized.");
  const cursor = new URL(request.url).searchParams.get("cursor");
  const observations = await getDb().observation.findMany({
    where: observationScope(user),
    take: 50,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      subject: true,
      gradeLevel: true,
      status: true,
      scheduledAt: true,
      observedAt: true,
      teacher: { select: { name: true, email: true } },
      observer: { select: { name: true, email: true } },
      school: { select: { name: true } },
    },
    orderBy: { id: "desc" },
  });
  return NextResponse.json({
    observations,
    nextCursor: observations.length === 50 ? observations[49].id : null,
  });
});
export const POST = api(async (request: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Unauthorized.");
  if (user.role !== "SCHOOL_ADMIN" || !user.schoolId || !user.districtId)
    throw new HttpError(403, "School admin required.");
  await limit(`create:${user.id}`, 30);
  const body = await jsonBody(
    request,
    z
      .object({
        title: z.string().trim().min(1).max(200),
        subject: z.string().trim().min(1).max(120),
        gradeLevel: z.string().trim().min(1).max(30),
        teacherId: z.string(),
        summary: z.string().max(10000).optional(),
        scheduledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.literal("SCHEDULED").optional(),
      })
      .strict(),
  );
  const date = new Date(`${body.scheduledAt}T16:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== body.scheduledAt
  )
    throw new HttpError(400, "Choose a valid observation date.");
  const teacher = await getDb().user.findFirst({
    where: {
      id: body.teacherId,
      role: "TEACHER",
      active: true,
      districtId: user.districtId,
      schoolId: user.schoolId,
    },
  });
  if (!teacher) throw new HttpError(403, "Choose a teacher from your school.");
  const observation = await getDb().observation.create({
    data: {
      title: body.title,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
      summary: body.summary,
      scheduledAt: date,
      status: "SCHEDULED",
      teacherId: teacher.id,
      observerId: user.id,
      districtId: user.districtId,
      schoolId: user.schoolId,
    },
  });
  return NextResponse.json(
    {
      observation: { id: observation.id, status: observation.status },
      redirectPath: `/observations/${observation.id}`,
    },
    { status: 201 },
  );
});
