// Phase 3 server-side auth helpers.
// This file connects the signed session cookie to the real user record in the
// database. Keep Prisma access here instead of in middleware.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import {
  roleDashboardPath,
  SESSION_COOKIE,
  type AppRole,
  type SessionUser,
  verifySessionToken,
} from "@/lib/session";

// Read and verify the session cookie from the current server request.
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  return verifySessionToken(token);
}

// Load the current database user for pages and route handlers that need the
// latest role/school/district data, not just the cookie payload.
export async function getCurrentUser() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return null;
  }

  return getDb().user.findUnique({
    where: {
      id: sessionUser.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      districtId: true,
      schoolId: true,
      district: {
        select: {
          id: true,
          name: true,
        },
      },
      school: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

// Require a logged-in user for protected server pages.
// If allowedRoles is provided, this also enforces role-based access.
export async function requireCurrentUser(allowedRoles?: AppRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(roleDashboardPath(user.role));
  }

  return user;
}

// This helper converts the database user into the smaller session payload.
export function toSessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  districtId: string | null;
  schoolId: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    districtId: user.districtId,
    schoolId: user.schoolId,
  } satisfies SessionUser;
}
