// Phase 9 AI insight API route.
// School admins call this after a transcript exists. The shared helper handles
// OpenAI Structured Outputs, fallback generation, and database persistence.

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { generateInsightForObservation } from "@/lib/insights";

export const runtime = "nodejs";

type ObservationAnalyzeRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: ObservationAnalyzeRouteProps
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const result = await generateInsightForObservation(id, user);

  if ("error" in result && result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  // The source tells the client whether OpenAI or fallback logic produced the
  // stored Insight row.
  return NextResponse.json(
    {
      fallbackReason: result.fallbackReason || null,
      insight: result.insight,
      source: result.source,
    },
    { status: result.status }
  );
}
