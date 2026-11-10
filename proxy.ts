// Refresh Supabase cookies before Server Components render. APIs enforce their
// own identity/record checks; this proxy additionally blocks cross-origin writes.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  const expectedOrigin = process.env.APP_ORIGIN || request.nextUrl.origin;
  if (mutation && request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    if (
      (origin && origin !== expectedOrigin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return NextResponse.json(
        { error: "Cross-origin request denied." },
        { status: 403 },
      );
    }
  }
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  // Public build/health pages remain available without configured credentials.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY)
    return response;
  const client = createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          response.headers.set("Cache-Control", "private, no-store");
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { data } = await client.auth.getUser();
  const protectedPage = /^\/(dashboard|observations|settings)(\/|$)/.test(
    request.nextUrl.pathname,
  );
  if (protectedPage && !data.user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
