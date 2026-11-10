// Output validation is shared by the worker and report renderer.
import { InsightIllustration } from "@prisma/client";
import { z } from "zod";
// Keep the enum values identical to Prisma so parsed output can be stored
// directly in the Insight.illustrationKey column.
const illustrationKeySchema = z.enum([
  InsightIllustration.PATIENCE_CLOCK,
  InsightIllustration.PARTICIPATION_BALANCE,
  InsightIllustration.CLARITY_STEPS,
  InsightIllustration.PACING_GAUGE,
]);

// The schema is intentionally close to the Insight model: one summary, several
// JSON sections, and an illustration key used by the report UI.
export const classroomInsightSchema = z.object({
  summary: z.string(),
  metrics: z.object({
    teacherTalkRatio: z.number().min(0).max(100),
    studentTalkRatio: z.number().min(0).max(100),
    questionCount: z.number().int().min(0),
    fillerWordCount: z.number().int().min(0),
    positiveReinforcementCount: z.number().int().min(0),
    pacingScore: z.number().min(0).max(100),
    clarityScore: z.number().min(0).max(100),
    pacingNotes: z.string(),
  }),
  recommendations: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
  sentiment: z.object({
    overall: z.enum(["supportive", "neutral", "corrective", "mixed"]),
    positiveMoments: z.number().int().min(0),
    correctionMoments: z.number().int().min(0),
    confidence: z.number().min(0).max(1),
  }),
  heatmap: z.array(
    z.object({
      label: z.string(),
      teacher: z.number(),
      students: z.number(),
    }),
  ),
  highlights: z.array(
    z.object({
      quote: z.string(),
      reason: z.string(),
      startMs: z.number(),
    }),
  ),
  illustrationKey: illustrationKeySchema,
});

export type ClassroomInsight = z.infer<typeof classroomInsightSchema>;
