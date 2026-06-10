// API routes receive unknown JSON, so these small helpers validate and coerce
// request data before Prisma writes anything to the database.

import { EvaluationCategory, ObservationStatus } from "@prisma/client";

import { evaluationCategories } from "@/lib/evaluation";

// This is the raw shape observation API routes accept from the browser.
export type ObservationRequestBody = {
  teacherId?: unknown;
  title?: unknown;
  subject?: unknown;
  gradeLevel?: unknown;
  scheduledAt?: unknown;
  summary?: unknown;
  feedback?: unknown;
  status?: unknown;
  scores?: unknown;
};

// Validated score rows are safe to pass into Prisma create/update calls.
export type ValidScoreInput = {
  category: EvaluationCategory;
  score: number;
  note: string;
};

// School admins can schedule observations or finalize completed reports.
export const editableObservationStatuses = new Set<ObservationStatus>([
  ObservationStatus.SCHEDULED,
  ObservationStatus.FINALIZED,
]);

// Convert form date input into a Date. The form sends a yyyy-mm-dd string.
export function parseDateInput(value: unknown) {
  if (typeof value !== "string" || !value) return null;

  const date = new Date(`${value}T16:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Safely coerce text values from JSON.
export function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Status is optional in create/update requests, so the caller supplies fallback.
export function parseObservationStatus(
  value: unknown,
  fallback: ObservationStatus
) {
  return editableObservationStatuses.has(value as ObservationStatus)
    ? (value as ObservationStatus)
    : fallback;
}

// Validate rubric scores and make sure every required category is present.
export function parseScoreInputs(value: unknown) {
  if (!Array.isArray(value)) {
    return { error: "Scores must be submitted as an array.", scores: [] };
  }

  const validCategorySet = new Set<string>(
    evaluationCategories.map((category) => category.toString())
  );
  const seen = new Set<EvaluationCategory>();
  const scores: ValidScoreInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: "Each score must be an object.", scores: [] };
    }

    const record = item as Record<string, unknown>;
    const rawCategory = record.category;
    const rawScore = record.score;
    const rawNote = record.note;

    if (typeof rawCategory !== "string" || !validCategorySet.has(rawCategory)) {
      return { error: "One score has an invalid category.", scores: [] };
    }

    const score = Number(rawScore);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return { error: "Scores must be whole numbers from 1 to 5.", scores: [] };
    }

    const category = rawCategory as EvaluationCategory;

    if (seen.has(category)) {
      return {
        error: "Submit each rubric category only once.",
        scores: [],
      };
    }

    seen.add(category);
    scores.push({
      category,
      score,
      note: typeof rawNote === "string" ? rawNote.trim() : "",
    });
  }

  if (seen.size !== evaluationCategories.length) {
    return { error: "Submit one score for each rubric category.", scores: [] };
  }

  return { error: "", scores };
}

// Read JSON safely so malformed requests get a normal response instead of an
// uncaught exception.
export async function readObservationBody(
  request: Request
): Promise<ObservationRequestBody> {
  try {
    return (await request.json()) as ObservationRequestBody;
  } catch {
    return {};
  }
}
