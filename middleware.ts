// Phase 3 middleware.
// Middleware runs before matching pages load. We use it to keep logged-out users
// away from protected dashboard routes and to send each role to its own area.

import { NextResponse, type NextRequest } from "next/server";

import {
  roleDashboardPath,
  SESSION_COOKIE,
  type AppRole,
  verifySessionToken,
} from "@/lib/session";

// Map dashboard path prefixes to the only role allowed to view that section.
const dashboardRoleByPrefix: Record<string, AppRole> = {
  "/dashboard/district": "DISTRICT_ADMIN",
  "/dashboard/school": "SCHOOL_ADMIN",
  "/dashboard/teacher": "TEACHER",
};

// Read the signed session token from the incoming request cookie.
async function getMiddlewareSession(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getMiddlewareSession(request);

  // Logged-in users should not see the login form again.
  if (pathname === "/login" && session) {
    return NextResponse.redirect(
      new URL(roleDashboardPath(session.role), request.url)
    );
  }

  // The dashboard index is only a routing hub. Send signed-in users to the
  // role-specific placeholder for now.
  if (pathname === "/dashboard" && session) {
    return NextResponse.redirect(
      new URL(roleDashboardPath(session.role), request.url)
    );
  }

  // Any dashboard or observation route requires a valid session.
  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/observations")) &&
    !session
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-specific dashboard URLs should not be cross-accessible.
  if (session) {
    const matchedDashboard = Object.entries(dashboardRoleByPrefix).find(
      ([prefix]) => pathname.startsWith(prefix)
    );

    if (matchedDashboard && matchedDashboard[1] !== session.role) {
      return NextResponse.redirect(
        new URL(roleDashboardPath(session.role), request.url)
      );
    }
  }

  return NextResponse.next();
}

// Limit middleware to auth-related pages so normal static assets are untouched.
export const config = {
  matcher: ["/login", "/dashboard/:path*", "/dashboard", "/observations/:path*"],
};
