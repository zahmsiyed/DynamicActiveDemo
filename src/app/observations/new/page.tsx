// Phase 5 create-observation page.
// This server component protects the route, loads teachers for the current
// school admin, and hands the actual interactive form to a client component.

import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { requireCurrentUser } from "@/lib/auth";
import {
  evaluationCategories,
  evaluationCategoryDescriptions,
  evaluationCategoryLabels,
} from "@/lib/evaluation";
import { getTeachersForSchoolAdmin } from "@/lib/observations";

import { ObservationForm } from "./observation-form";

export default async function NewObservationPage() {
  const user = await requireCurrentUser(["SCHOOL_ADMIN"]);
  const teachers = await getTeachersForSchoolAdmin(user);

  // The form receives label-ready rubric data instead of raw enum names.
  const rubric = evaluationCategories.map((category) => ({
    category,
    label: evaluationCategoryLabels[category],
    description: evaluationCategoryDescriptions[category],
  }));

  return (
    <DashboardShell
      user={user}
      eyebrow="Create observation"
      title="New teacher observation"
      description="Create the core observation record, score the rubric categories, and write the first round of teacher feedback."
    >
      <div className="flex">
        <Link
          className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-300/60 hover:text-white"
          href="/dashboard/school"
        >
          Back to school dashboard
        </Link>
      </div>

      <ObservationForm teachers={teachers} rubric={rubric} />
    </DashboardShell>
  );
}
