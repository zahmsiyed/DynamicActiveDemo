// Phase 5 evaluation helpers.
// These labels keep raw Prisma enum values out of forms, reports, and tables.

import { EvaluationCategory } from "@prisma/client";

// Ordered rubric categories used by the create-observation form and report page.
export const evaluationCategories = [
  EvaluationCategory.CLASSROOM_MANAGEMENT,
  EvaluationCategory.STUDENT_ENGAGEMENT,
  EvaluationCategory.LESSON_PACING,
  EvaluationCategory.INSTRUCTIONAL_CLARITY,
  EvaluationCategory.COMMUNICATION,
  EvaluationCategory.ASSESSMENT_METHODS,
] as const;

// Human-readable category labels for UI.
export const evaluationCategoryLabels: Record<EvaluationCategory, string> = {
  CLASSROOM_MANAGEMENT: "Classroom management",
  STUDENT_ENGAGEMENT: "Student engagement",
  LESSON_PACING: "Lesson pacing",
  INSTRUCTIONAL_CLARITY: "Instructional clarity",
  COMMUNICATION: "Communication",
  ASSESSMENT_METHODS: "Assessment methods",
};

// Short coaching descriptions that explain what each rubric category means.
export const evaluationCategoryDescriptions: Record<EvaluationCategory, string> = {
  CLASSROOM_MANAGEMENT: "Routines, transitions, expectations, and learning environment.",
  STUDENT_ENGAGEMENT: "Student participation, discussion quality, and active learning.",
  LESSON_PACING: "Flow, timing, checks for understanding, and lesson momentum.",
  INSTRUCTIONAL_CLARITY: "Directions, modeling, examples, and conceptual clarity.",
  COMMUNICATION: "Teacher language, listening moves, tone, and feedback delivery.",
  ASSESSMENT_METHODS: "Evidence collection, questioning, checks, and adjustment.",
};

// Average a list of score records in one place so reports and dashboards agree.
export function averageScore(scores: { score: number }[]) {
  if (!scores.length) return 0;

  const total = scores.reduce((sum, score) => sum + score.score, 0);
  return Number((total / scores.length).toFixed(1));
}
