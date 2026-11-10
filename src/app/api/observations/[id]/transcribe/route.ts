// Legacy synchronous processing is retired; use signed uploads and durable runs.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Use the signed upload and evaluation workflow." }, { status: 410 });
}
