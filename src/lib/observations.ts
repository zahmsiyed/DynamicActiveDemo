// This file keeps observation access checks and report queries in one place so
// pages and route handlers do not duplicate authorization rules.

import { Role, type Prisma } from "@prisma/client";

import { getDb } from "@/lib/db";
import { type AppRole } from "@/lib/session";

// Authenticated pages pass this minimal user shape into observation helpers.
export type ObservationUser = {
  id: string;
  role: AppRole;
  districtId: string | null;
  schoolId: string | null;
};

// The report page needs the observation plus its rubric, feedback, organization,
// and AI/audio workflow data flags.
export const observationReportInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
    },
  },
  observer: {
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
    },
  },
  school: {
    select: {
      id: true,
      name: true,
    },
  },
  district: {
    select: {
      id: true,
      name: true,
    },
  },
  scores: {
    orderBy: {
      category: "asc",
    },
  },
  feedback: {
    include: {
      author: {
        select: {
          name: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  audioUpload: true,
  transcription: {
    include: {
      segments: {
        orderBy: {
          startMs: "asc",
        },
      },
    },
  },
  insight: true,
} satisfies Prisma.ObservationInclude;

// Prisma result type for one report query.
export type ObservationReport = Prisma.ObservationGetPayload<{
  include: typeof observationReportInclude;
}>;

// School admins can create observations only for teachers in their own school.
export async function getTeachersForSchoolAdmin(user: ObservationUser) {
  if (user.role !== "SCHOOL_ADMIN" || !user.schoolId) return [];

  return getDb().user.findMany({
    where: {
      role: Role.TEACHER,
      schoolId: user.schoolId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

// This access check is used by the report page and observation API routes.
// District admins see district observations, school admins see school
// observations, and teachers see only their own observations.
export function canViewObservation(
  user: ObservationUser,
  observation: {
    teacherId: string;
    schoolId: string;
    districtId: string;
  }
) {
  if (user.role === "DISTRICT_ADMIN") {
    return observation.districtId === user.districtId;
  }

  if (user.role === "SCHOOL_ADMIN") {
    return observation.schoolId === user.schoolId;
  }

  return observation.teacherId === user.id;
}

// Load one observation report only if the current user is allowed to see it.
export async function getObservationReportForUser(
  observationId: string,
  user: ObservationUser
) {
  const observation = await getDb().observation.findUnique({
    where: {
      id: observationId,
    },
    include: observationReportInclude,
  });

  if (!observation || !canViewObservation(user, observation)) {
    return null;
  }

  return observation;
}
