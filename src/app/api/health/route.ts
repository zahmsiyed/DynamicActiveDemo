// External monitors receive readiness only; queue internals require operator CLI.
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    const worker = await getDb().workerHeartbeat.findFirst({
      where: { seenAt: { gt: new Date(Date.now() - 60_000) } },
    });
    return NextResponse.json(
      { ready: !!worker },
      { status: worker ? 200 : 503 },
    );
  } catch {
    return NextResponse.json({ ready: false }, { status: 503 });
  }
}
