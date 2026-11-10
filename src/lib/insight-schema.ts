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
    teacherTalkRatio: z.number(),
    studentTalkRatio: z.number(),
    questionCount: z.number(),
    fillerWordCount: z.number(),
    positiveReinforcementCount: z.number(),
    pacingScore: z.number(),
    clarityScore: z.number(),
    pacingNotes: z.string(),
  }),
  recommendations: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
  sentiment: z.object({
    overall: z.enum(["supportive", "neutral", "corrective", "mixed"]),
    positiveMoments: z.number(),
    correctionMoments: z.number(),
    confidence: z.number(),
  }),
  heatmap: z.array(
    z.object({
      label: z.string(),
      teacher: z.number(),
      students: z.number(),
    })
  ),
  highlights: z.array(
    z.object({
      quote: z.string(),
      reason: z.string(),
      startMs: z.number(),
    })
  ),
  illustrationKey: illustrationKeySchema,
});

export type ClassroomInsight = z.infer<typeof classroomInsightSchema>;

