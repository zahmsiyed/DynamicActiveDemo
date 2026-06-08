// Phase 3 session utilities.
// This file contains only cookie/JWT logic, so it can be safely imported by
// middleware without pulling Prisma or database code into the middleware runtime.

import { jwtVerify, SignJWT } from "jose";

// This is the browser cookie name that stores the signed session token.
export const SESSION_COOKIE = "teacher_eval_session";

// Keeping the app role type here avoids importing Prisma enums into client or
// middleware code that does not need the full Prisma package.
export type AppRole = "DISTRICT_ADMIN" | "SCHOOL_ADMIN" | "TEACHER";

// This is the small amount of user data stored inside the signed session token.
// It is not secret, but it is tamper-resistant because the token is signed.
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  districtId: string | null;
  schoolId: string | null;
};

// These labels are used by the login page and protected dashboard placeholders.
export const roleLabels: Record<AppRole, string> = {
  DISTRICT_ADMIN: "District Admin",
  SCHOOL_ADMIN: "School Admin",
  TEACHER: "Teacher",
};

// Each role gets its own dashboard URL.
// Phase 4 will replace these placeholders with real dashboard content.
export function roleDashboardPath(role: AppRole) {
  if (role === "DISTRICT_ADMIN") return "/dashboard/district";
  if (role === "SCHOOL_ADMIN") return "/dashboard/school";
  return "/dashboard/teacher";
}

// This validates unknown strings before treating them as app roles.
function isAppRole(value: unknown): value is AppRole {
  return (
    value === "DISTRICT_ADMIN" || value === "SCHOOL_ADMIN" || value === "TEACHER"
  );
}

// jose expects the secret as bytes, so we encode the environment variable once
// for signing and verifying tokens.
function getSessionSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ??
      "local-phase-3-development-secret-change-before-deploying"
  );
}

// Create a signed token that expires after a normal work session.
export async function signSessionToken(user: SessionUser) {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    districtId: user.districtId,
    schoolId: user.schoolId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSessionSecret());
}

// Verify a token and convert it back into the SessionUser shape.
// Invalid, expired, or tampered tokens return null instead of throwing.
export async function verifySessionToken(token?: string) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    if (!payload.sub || !isAppRole(payload.role)) {
      return null;
    }

    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role,
      districtId: payload.districtId ? String(payload.districtId) : null,
      schoolId: payload.schoolId ? String(payload.schoolId) : null,
    } satisfies SessionUser;
  } catch {
    return null;
  }
}
