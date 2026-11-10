// Shared validation and error handling keeps failures predictable and private.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function jsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success) throw new HttpError(400, "Invalid request fields.");
  return result.data;
}
export function api<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try { return await handler(...args); }
    catch (error) {
      if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
      // Never log provider responses, DB connection strings, or classroom content.
      console.error("Request failed", { type: error instanceof Error ? error.name : "unknown" });
      return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
    }
  };
}
export async function limit(key: string, maximum: number, seconds = 60) {
  // The increment/reset is atomic across all web instances.
  const rows = await getDb().$queryRaw<{ count: number }[]>`
    INSERT INTO "RequestLimit" (key, count, "expiresAt") VALUES (${key}, 1, now() + ${seconds} * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RequestLimit"."expiresAt" < now() THEN 1 ELSE "RequestLimit".count + 1 END,
    "expiresAt" = CASE WHEN "RequestLimit"."expiresAt" < now() THEN now() + ${seconds} * interval '1 second' ELSE "RequestLimit"."expiresAt" END RETURNING count`;
  if (rows[0].count > maximum) throw new HttpError(429, "Too many requests. Try again later.");
}
