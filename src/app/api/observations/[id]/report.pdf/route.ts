// Phase 12 PDF export route.
// It reuses the same observation access rules as the HTML report page, then
// returns a generated PDF as a downloadable file.

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getObservationReportForUser } from "@/lib/observations";
import { buildObservationReportPdf } from "@/lib/pdf-report";

export const runtime = "nodejs";

type ObservationPdfRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

function pdfFileName(title: string) {
  const safeTitle =
    title
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "observation-report";

  return `${safeTitle}.pdf`;
}

export async function GET(
  _request: Request,
  { params }: ObservationPdfRouteProps
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const observation = await getObservationReportForUser(id, user);

  if (!observation) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }

  const pdf = buildObservationReportPdf(observation);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Disposition": `attachment; filename="${pdfFileName(
        observation.title
      )}"`,
      "Content-Type": "application/pdf",
    },
  });
}
