// This application authenticates on the server, so browser JavaScript never
// needs the Auth cookies. Match options during both login and token refresh.
export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.APP_ORIGIN?.startsWith("https://") ?? false,
  };
}
