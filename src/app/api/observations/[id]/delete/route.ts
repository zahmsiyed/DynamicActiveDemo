// Explicit deletion shares the same durable Storage cleanup as retention.
import { NextResponse } from "next/server";
import { editableObservation } from "@/lib/jobs/requests";
import { deleteObservation } from "@/lib/lifecycle/retention";
import { getDb } from "@/lib/db";
import { api } from "@/lib/http";
export const POST = api(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const { user, observation } = await editableObservation(id);
    await getDb().observation.update({
      where: { id },
      data: { deletingAt: new Date() },
    });
    await deleteObservation(id, observation.districtId, user.id);
    return NextResponse.json({ ok: true });
  },
);
