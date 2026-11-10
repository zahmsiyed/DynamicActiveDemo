// GET returns one report if the signed-in user can view it. PATCH lets a school
// admin update editable report fields without bypassing role scope.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getObservationReportForUser } from "@/lib/observations";

type ObservationApiRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: ObservationApiRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const observation = await getObservationReportForUser(id, user);

  if (!observation) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }

  return NextResponse.json({ observation });
}

// Scores and publication now change only through explicit review/reopen actions.
export async function PATCH() {
  return NextResponse.json({ error: "Use the review workflow." }, { status: 410 });
}
