// Provider output is untrusted. Validate shape, category coverage, and evidence
// before any generated result can become a persisted evaluation suggestion.
import { z } from "zod";
import { classroomInsightSchema } from "@/lib/insight-schema";
export const categories = [
  "CLASSROOM_MANAGEMENT",
  "STUDENT_ENGAGEMENT",
  "LESSON_PACING",
  "INSTRUCTIONAL_CLARITY",
  "COMMUNICATION",
  "ASSESSMENT_METHODS",
] as const;
export const transcriptSchema = z.object({
  provider: z.string(),
  model: z.string(),
  text: z.string().min(1),
  segments: z
    .array(
      z.object({
        speakerLabel: z.string(),
        text: z.string().min(1),
        startMs: z.number().int().min(0),
        endMs: z.number().int().min(0),
      }),
    )
    .min(1),
});
export const analysisSchema = z.object({
  model: z.string(),
  insight: classroomInsightSchema,
  suggestions: z
    .array(
      z.object({
        category: z.enum(categories),
        score: z.number().int().min(1).max(5).nullable(),
        rationale: z.string().min(1),
        evidence: z.array(
          z.object({
            segmentIndex: z.number().int().min(0),
            quote: z.string().min(1),
          }),
        ),
      }),
    )
    .length(6),
});
export type Transcript = z.infer<typeof transcriptSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export function validateAnalysis(
  value: unknown,
  transcript: Transcript,
): Analysis {
  const result = analysisSchema.parse(value);
  if (new Set(result.suggestions.map((s) => s.category)).size !== 6)
    throw new Error("invalid_category_coverage");
  for (const suggestion of result.suggestions) {
    if (suggestion.score !== null && !suggestion.evidence.length)
      throw new Error("missing_evidence");
    for (const evidence of suggestion.evidence) {
      if (
        !transcript.segments[evidence.segmentIndex]?.text.includes(
          evidence.quote,
        )
      )
        throw new Error("invalid_evidence");
    }
  }
  return result;
}

// Provider errors expose only safe codes; response bodies may contain recordings.
export class ProcessingError extends Error {
  constructor(
    public code: string,
    public retryable = false,
  ) {
    super(code);
  }
}
export const maxAttempts = 5;
export function retryDelay(attempt: number, random = Math.random) {
  return Math.min(900, 5 * 2 ** (attempt - 1)) + Math.floor(random() * 5);
}
