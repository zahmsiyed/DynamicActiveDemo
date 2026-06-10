// This file owns the classroom insight schema, OpenAI Structured Outputs call,
// deterministic fallback insight generation, and Prisma persistence.

import {
  InsightIllustration,
  ObservationStatus,
  SpeakerType,
  type Prisma,
} from "@prisma/client";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { evaluationCategoryLabels } from "@/lib/evaluation";
import { type ObservationUser } from "@/lib/observations";
import { formatTranscriptRange } from "@/lib/transcripts";

const insightModel = process.env.OPENAI_INSIGHT_MODEL ?? "gpt-4o-mini";

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

type InsightGenerationSource = "openai" | "fallback";

type TranscriptSegmentForInsight = {
  speakerLabel: string;
  speakerType: SpeakerType;
  text: string;
  startMs: number;
  endMs: number;
};

type ObservationForInsight = {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  status: ObservationStatus;
  summary: string | null;
  schoolId: string;
  districtId: string;
  teacher: {
    name: string;
    title: string | null;
  };
  scores: {
    category: keyof typeof evaluationCategoryLabels;
    score: number;
    note: string | null;
  }[];
  transcription: {
    provider: string;
    model: string;
    text: string;
    segments: TranscriptSegmentForInsight[];
  } | null;
};

type OpenAiResponseObject = {
  output_text?: unknown;
  output?: unknown;
};

// OpenAI Structured Outputs requires a JSON Schema. Zod remains the source of
// truth, and we remove the draft marker because the API only needs the schema.
function buildOpenAiInsightJsonSchema() {
  const zodJsonSchema = z.toJSONSchema(classroomInsightSchema) as Record<
    string,
    unknown
  >;
  const { $schema, ...schema } = zodJsonSchema;
  void $schema;

  return schema;
}

const openAiInsightJsonSchema = buildOpenAiInsightJsonSchema();

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function segmentDuration(segment: Pick<TranscriptSegmentForInsight, "startMs" | "endMs">) {
  return Math.max(0, segment.endMs - segment.startMs);
}

function transcriptText(segments: TranscriptSegmentForInsight[]) {
  return segments.map((segment) => segment.text).join(" ");
}

function countMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

function pickIllustrationKey(metrics: ClassroomInsight["metrics"]) {
  if (metrics.teacherTalkRatio > 64) {
    return InsightIllustration.PARTICIPATION_BALANCE;
  }

  if (metrics.questionCount < 3) {
    return InsightIllustration.CLARITY_STEPS;
  }

  if (metrics.pacingScore < 72) {
    return InsightIllustration.PACING_GAUGE;
  }

  return InsightIllustration.PATIENCE_CLOCK;
}

function bucketPercentages(
  segments: TranscriptSegmentForInsight[],
  startMs: number,
  endMs: number
) {
  const bucketSegments = segments.filter(
    (segment) => segment.endMs > startMs && segment.startMs < endMs
  );
  const teacherMs = bucketSegments
    .filter((segment) => segment.speakerType === SpeakerType.TEACHER)
    .reduce((sum, segment) => sum + segmentDuration(segment), 0);
  const studentMs = bucketSegments
    .filter(
      (segment) =>
        segment.speakerType === SpeakerType.STUDENT ||
        segment.speakerType === SpeakerType.GROUP
    )
    .reduce((sum, segment) => sum + segmentDuration(segment), 0);
  const totalMs = teacherMs + studentMs;

  if (!totalMs) {
    return { teacher: 0, students: 0 };
  }

  const teacher = clampPercent((teacherMs / totalMs) * 100);

  return {
    teacher,
    students: 100 - teacher,
  };
}

function buildFallbackHeatmap(segments: TranscriptSegmentForInsight[]) {
  const durationMs = segments.reduce(
    (duration, segment) => Math.max(duration, segment.endMs),
    0
  );

  if (!durationMs) {
    return [
      { label: "Opening", teacher: 0, students: 0 },
      { label: "Middle", teacher: 0, students: 0 },
      { label: "Closing", teacher: 0, students: 0 },
    ];
  }

  const third = durationMs / 3;

  return [
    { label: "Opening", ...bucketPercentages(segments, 0, third) },
    { label: "Middle", ...bucketPercentages(segments, third, third * 2) },
    { label: "Closing", ...bucketPercentages(segments, third * 2, durationMs) },
  ];
}

function buildFallbackRecommendations(metrics: ClassroomInsight["metrics"]) {
  const recommendations = [
    {
      title: "Name the wait time",
      body: "After asking an evidence question, pause long enough for more students to prepare a complete response.",
      priority: "high" as const,
    },
    {
      title: "Convert one explanation into student talk",
      body: "When a teacher explanation runs long, ask a student to restate the next step or compare it with a partner.",
      priority: "medium" as const,
    },
    {
      title: "Anchor feedback in evidence",
      body: "Keep using transcript-level evidence when naming strengths and next steps in the coaching conversation.",
      priority: "low" as const,
    },
  ];

  if (metrics.studentTalkRatio >= 45) {
    recommendations[0] = {
      title: "Extend peer-to-peer reasoning",
      body: "Student participation is visible; deepen it by asking students to respond directly to a peer's evidence.",
      priority: "medium",
    };
  }

  if (metrics.questionCount < 3) {
    recommendations[1] = {
      title: "Add a check-for-understanding question",
      body: "Insert a quick question after the key explanation so you can verify student thinking before moving on.",
      priority: "high",
    };
  }

  return recommendations;
}

function buildFallbackHighlights(segments: TranscriptSegmentForInsight[]) {
  const teacherQuestion = segments.find(
    (segment) =>
      segment.speakerType === SpeakerType.TEACHER && segment.text.includes("?")
  );
  const studentTurn = segments.find(
    (segment) =>
      segment.speakerType === SpeakerType.STUDENT ||
      segment.speakerType === SpeakerType.GROUP
  );
  const fallbackSegment = segments[0];

  return [
    teacherQuestion
      ? {
          quote: teacherQuestion.text,
          reason: "Teacher question that can anchor coaching about evidence and wait time.",
          startMs: teacherQuestion.startMs,
        }
      : {
          quote: fallbackSegment?.text ?? "Transcript evidence was limited.",
          reason: "Use this as the first available transcript evidence point.",
          startMs: fallbackSegment?.startMs ?? 0,
        },
    studentTurn
      ? {
          quote: studentTurn.text,
          reason: "Student contribution that shows how learners entered the discussion.",
          startMs: studentTurn.startMs,
        }
      : {
          quote: fallbackSegment?.text ?? "No student turn was detected.",
          reason: "The transcript needs more student evidence before stronger conclusions.",
          startMs: fallbackSegment?.startMs ?? 0,
        },
  ];
}

// The fallback is deterministic. It uses transcript structure and keywords so
// the app remains useful without an API key, while still teaching the same data
// shape as the real Structured Outputs path.
function buildFallbackInsight(observation: ObservationForInsight): ClassroomInsight {
  const segments = observation.transcription?.segments ?? [];
  const text = transcriptText(segments);
  const totalMs =
    segments.reduce((sum, segment) => sum + segmentDuration(segment), 0) || 1;
  const teacherMs = segments
    .filter((segment) => segment.speakerType === SpeakerType.TEACHER)
    .reduce((sum, segment) => sum + segmentDuration(segment), 0);
  const studentMs = segments
    .filter(
      (segment) =>
        segment.speakerType === SpeakerType.STUDENT ||
        segment.speakerType === SpeakerType.GROUP
    )
    .reduce((sum, segment) => sum + segmentDuration(segment), 0);
  const teacherTalkRatio = clampPercent((teacherMs / totalMs) * 100);
  const studentTalkRatio = clampPercent((studentMs / totalMs) * 100);
  const questionCount = countMatches(text, /\?/g);
  const positiveReinforcementCount = countMatches(
    text,
    /\b(good|great|excellent|exactly|strong|nice|thank|appreciate)\b/gi
  );
  const correctionMoments = countMatches(
    text,
    /\b(no|not quite|instead|remember|try again|correct)\b/gi
  );
  const fillerWordCount = countMatches(
    text,
    /\b(um|uh|like|you know)\b/gi
  );
  const pacingScore = clampPercent(
    82 - Math.max(0, teacherTalkRatio - 60) + Math.min(questionCount * 2, 8)
  );
  const clarityScore = clampPercent(
    76 + Math.min(questionCount * 3, 12) + Math.min(positiveReinforcementCount, 5)
  );
  const metrics = {
    teacherTalkRatio,
    studentTalkRatio,
    questionCount,
    fillerWordCount,
    positiveReinforcementCount,
    pacingScore,
    clarityScore,
    pacingNotes:
      teacherTalkRatio > 64
        ? "Teacher talk is carrying most of the transcript, so pacing should create more student processing time."
        : "Pacing shows some student entry points; the next step is making those turns more intentional.",
  };

  return classroomInsightSchema.parse({
    summary:
      segments.length > 0
        ? `The transcript for ${observation.title} shows a ${observation.subject} lesson with ${studentTalkRatio}% student talk and ${questionCount} teacher questions. The strongest next step is to protect wait time and use student responses as evidence for coaching.`
        : "The transcript is too short for a strong analysis, so this fallback insight focuses on the need for more classroom evidence before making coaching claims.",
    metrics,
    recommendations: buildFallbackRecommendations(metrics),
    sentiment: {
      overall:
        positiveReinforcementCount > correctionMoments ? "supportive" : "mixed",
      positiveMoments: positiveReinforcementCount,
      correctionMoments,
      confidence: segments.length > 2 ? 0.74 : 0.42,
    },
    heatmap: buildFallbackHeatmap(segments),
    highlights: buildFallbackHighlights(segments),
    illustrationKey: pickIllustrationKey(metrics),
  });
}

function formatScoresForPrompt(observation: ObservationForInsight) {
  return observation.scores.map((score) => ({
    category: evaluationCategoryLabels[score.category],
    score: score.score,
    note: score.note ?? "",
  }));
}

function formatTranscriptForPrompt(segments: TranscriptSegmentForInsight[]) {
  return segments
    .map(
      (segment) =>
        `[${formatTranscriptRange(segment.startMs, segment.endMs)}] ${segment.speakerLabel}: ${segment.text}`
    )
    .join("\n");
}

function buildInsightPrompt(observation: ObservationForInsight) {
  return [
    `Observation title: ${observation.title}`,
    `Teacher: ${observation.teacher.name}${
      observation.teacher.title ? `, ${observation.teacher.title}` : ""
    }`,
    `Class: ${observation.subject}, grade ${observation.gradeLevel}`,
    `Existing observer summary: ${observation.summary ?? "none"}`,
    `Rubric scores: ${JSON.stringify(formatScoresForPrompt(observation))}`,
    `Transcript provider: ${observation.transcription?.provider ?? "none"}`,
    `Transcript model: ${observation.transcription?.model ?? "none"}`,
    "Transcript:",
    formatTranscriptForPrompt(observation.transcription?.segments ?? []),
  ].join("\n\n");
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// The raw Responses API JSON can contain multiple output items. This helper
// finds the assistant text item and surfaces refusals as ordinary errors.
function extractResponseOutputText(responseBody: unknown) {
  const response = readObject(responseBody) as OpenAiResponseObject | null;

  if (!response) return "";

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) return "";

  for (const item of response.output) {
    const outputItem = readObject(item);
    const content = outputItem?.content;

    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      const itemRecord = readObject(contentItem);

      if (itemRecord?.type === "refusal" && typeof itemRecord.refusal === "string") {
        throw new Error(`OpenAI refused the analysis request: ${itemRecord.refusal}`);
      }

      if (itemRecord?.type === "output_text" && typeof itemRecord.text === "string") {
        return itemRecord.text;
      }
    }
  }

  return "";
}

async function generateInsightWithOpenAi({
  apiKey,
  observation,
}: {
  apiKey: string | undefined;
  observation: ObservationForInsight;
}) {
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: insightModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are an instructional coach analyzing classroom observation transcripts.",
                "Use only the provided transcript, rubric, and observation context.",
                "Return concise, teacher-facing coaching feedback.",
                "Metrics that are percentages or scores should be 0 to 100.",
                "Choose illustrationKey from the allowed enum based on the strongest coaching theme.",
                "Produce JSON that exactly matches the requested schema.",
              ].join(" "),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildInsightPrompt(observation),
            },
          ],
        },
      ],
      max_output_tokens: 1800,
      store: false,
      temperature: 0.2,
      text: {
        format: {
          type: "json_schema",
          name: "classroom_observation_insight",
          description:
            "Structured classroom observation insight for a teacher evaluation report.",
          strict: true,
          schema: openAiInsightJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI insight generation failed with ${response.status}: ${errorText.slice(
        0,
        240
      )}`
    );
  }

  const responseBody = await response.json();
  const outputText = extractResponseOutputText(responseBody);

  if (!outputText) {
    throw new Error("OpenAI returned no structured insight text.");
  }

  return classroomInsightSchema.parse(JSON.parse(outputText));
}

async function storeInsight({
  insight,
  observation,
}: {
  insight: ClassroomInsight;
  observation: ObservationForInsight;
}) {
  const shouldKeepCurrentStatus = observation.status === ObservationStatus.FINALIZED;
  const db = getDb();

  const [storedInsight] = await db.$transaction([
    db.insight.upsert({
      where: {
        observationId: observation.id,
      },
      update: {
        summary: insight.summary,
        metricsJson: insight.metrics as Prisma.InputJsonValue,
        recommendations: insight.recommendations as Prisma.InputJsonValue,
        sentimentJson: insight.sentiment as Prisma.InputJsonValue,
        heatmapJson: insight.heatmap as Prisma.InputJsonValue,
        highlightsJson: insight.highlights as Prisma.InputJsonValue,
        illustrationKey: insight.illustrationKey,
      },
      create: {
        observationId: observation.id,
        summary: insight.summary,
        metricsJson: insight.metrics as Prisma.InputJsonValue,
        recommendations: insight.recommendations as Prisma.InputJsonValue,
        sentimentJson: insight.sentiment as Prisma.InputJsonValue,
        heatmapJson: insight.heatmap as Prisma.InputJsonValue,
        highlightsJson: insight.highlights as Prisma.InputJsonValue,
        illustrationKey: insight.illustrationKey,
      },
    }),
    db.observation.update({
      where: {
        id: observation.id,
      },
      data: {
        status: shouldKeepCurrentStatus
          ? observation.status
          : ObservationStatus.ANALYZED,
      },
      select: {
        id: true,
      },
    }),
  ]);

  return storedInsight;
}

// Route handlers call this function. It enforces school-admin generation, uses
// OpenAI when possible, and stores fallback data when the live path cannot run.
export async function generateInsightForObservation(
  observationId: string,
  user: ObservationUser
) {
  if (user.role !== "SCHOOL_ADMIN" || !user.schoolId || !user.districtId) {
    return {
      error: "Only school admins can generate AI insights.",
      status: 403,
    };
  }

  const observation = await getDb().observation.findUnique({
    where: {
      id: observationId,
    },
    select: {
      id: true,
      title: true,
      subject: true,
      gradeLevel: true,
      status: true,
      summary: true,
      schoolId: true,
      districtId: true,
      teacher: {
        select: {
          name: true,
          title: true,
        },
      },
      scores: {
        select: {
          category: true,
          score: true,
          note: true,
        },
      },
      transcription: {
        select: {
          provider: true,
          model: true,
          text: true,
          segments: {
            orderBy: {
              startMs: "asc",
            },
            select: {
              speakerLabel: true,
              speakerType: true,
              text: true,
              startMs: true,
              endMs: true,
            },
          },
        },
      },
    },
  });

  if (
    !observation ||
    observation.schoolId !== user.schoolId ||
    observation.districtId !== user.districtId
  ) {
    return { error: "Observation not found.", status: 404 };
  }

  if (!observation.transcription) {
    return {
      error: "Generate a transcript before creating AI insights.",
      status: 400,
    };
  }

  let source: InsightGenerationSource = "fallback";
  let fallbackReason = process.env.OPENAI_API_KEY ? "" : "missing_api_key";
  let insight: ClassroomInsight | null = null;

  try {
    insight = await generateInsightWithOpenAi({
      apiKey: process.env.OPENAI_API_KEY,
      observation,
    });

    if (insight) {
      source = "openai";
    }
  } catch (error) {
    fallbackReason =
      error instanceof Error ? `openai_error: ${error.message}` : "openai_error";
  }

  if (!insight) {
    insight = buildFallbackInsight(observation);
  }

  const storedInsight = await storeInsight({ insight, observation });

  return {
    fallbackReason,
    insight: storedInsight,
    source,
    status: source === "openai" ? 201 : 200,
  };
}
