// The login page sends email/password here, and this route creates the signed
// HTTP-only cookie when the credentials match a seeded database user.

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { signSessionToken, SESSION_COOKIE, roleDashboardPath } from "@/lib/session";
import { toSessionUser } from "@/lib/auth";

// Keep cookie settings in one place so logout and auth behavior stay aligned.
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 8,
  path: "/",
};

// Safely parse the request body without adding a validation library yet.
async function readLoginBody(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
    };

    return {
      email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
      password: typeof body.password === "string" ? body.password : "",
    };
  } catch {
    return {
      email: "",
      password: "",
    };
  }
}

export async function POST(request: Request) {
  const { email, password } = await readLoginBody(request);

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter both email and password." },
      { status: 400 }
    );
  }

  try {
    // Demo users are created by prisma/seed.ts.
    const user = await getDb().user.findUnique({
      where: {
        email,
      },
    });

    // Use the same generic error for missing user and wrong password so the API
    // does not reveal which emails exist.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid demo credentials." },
        { status: 401 }
      );
    }

    // Store only the small session payload in the signed token.
    const sessionUser = toSessionUser(user);
    const token = await signSessionToken(sessionUser);
    const redirectPath = roleDashboardPath(sessionUser.role);

    const response = NextResponse.json({
      user: sessionUser,
      redirectPath,
    });

    // HTTP-only means browser JavaScript cannot read the cookie directly.
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);

    return response;
  } catch (error) {
    console.error("Login failed before a session could be created.", error);

    return NextResponse.json(
      {
        error:
          "Login is temporarily unavailable. Check the deployment database configuration.",
      },
      { status: 500 }
    );
  }
}
