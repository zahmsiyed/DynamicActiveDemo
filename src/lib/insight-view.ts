// The database stores insight sections as JSON, so this file converts those raw
// fields into a stable display shape before components render them.

import { InsightIllustration, type Prisma } from "@prisma/client";

export type InsightRecordForView = {
  summary: string;
  metricsJson: Prisma.JsonValue;
  recommendations: Prisma.JsonValue;
  sentimentJson: Prisma.JsonValue;
  heatmapJson: Prisma.JsonValue;
  highlightsJson: Prisma.JsonValue;
  illustrationKey: InsightIllustration;
};

export type InsightRecommendationView = {
  title: string;
  body: string;
  priority: "high" | "medium" | "low" | "unknown";
};

export type InsightHeatmapRowView = {
  label: string;
  teacher: number;
  students: number;
};

export type InsightHighlightView = {
  quote: string;
  reason: string;
  startMs: number;
};

export type InsightMetricView = {
  clarityScore: number | null;
  fillerWordCount: number | null;
  pacingNotes: string | null;
  pacingScore: number | null;
  positiveReinforcementCount: number | null;
  questionCount: number | null;
  studentTalkRatio: number | null;
  teacherTalkRatio: number | null;
};

export type InsightSentimentView = {
  confidence: number | null;
  correctionMoments: number | null;
  overall: string;
  positiveMoments: number | null;
};

export type InsightView = {
  highlightStartMs: number[];
  highlights: InsightHighlightView[];
  heatmap: InsightHeatmapRowView[];
  illustrationKey: InsightIllustration;
  metrics: InsightMetricView;
  recommendations: InsightRecommendationView[];
  sentiment: InsightSentimentView;
  summary: string;
};

function readRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}

function readNumber(
  record: Record<string, Prisma.JsonValue> | null,
  key: string
) {
  const value = record?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(
  record: Record<string, Prisma.JsonValue> | null,
  key: string
) {
  const value = record?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function clampPercent(value: number | null) {
  if (value === null) return null;

  return Math.max(0, Math.min(100, Math.round(value)));
}

function readRecommendations(
  recommendations: Prisma.JsonValue | null | undefined
): InsightRecommendationView[] {
  if (!Array.isArray(recommendations)) return [];

  return recommendations
    .map((item) => {
      const record = readRecord(item);
      const title = readString(record, "title");
      const body = readString(record, "body");
      const rawPriority = readString(record, "priority");
      const priority =
        rawPriority === "high" ||
        rawPriority === "medium" ||
        rawPriority === "low"
          ? rawPriority
          : "unknown";

      if (!title || !body) return null;

      return { title, body, priority };
    })
    .filter((item): item is InsightRecommendationView => Boolean(item));
}

function readHeatmap(
  heatmap: Prisma.JsonValue | null | undefined
): InsightHeatmapRowView[] {
  if (!Array.isArray(heatmap)) return [];

  return heatmap
    .map((item) => {
      const record = readRecord(item);
      const label = readString(record, "label");
      const teacher = clampPercent(readNumber(record, "teacher"));
      const students = clampPercent(readNumber(record, "students"));

      if (!label || teacher === null || students === null) return null;

      return { label, teacher, students };
    })
    .filter((item): item is InsightHeatmapRowView => Boolean(item));
}

function readHighlights(
  highlights: Prisma.JsonValue | null | undefined
): InsightHighlightView[] {
  if (!Array.isArray(highlights)) return [];

  return highlights
    .map((item) => {
      const record = readRecord(item);
      const quote = readString(record, "quote");
      const reason = readString(record, "reason");
      const startMs = readNumber(record, "startMs");

      if (!quote || !reason || startMs === null) return null;

      return { quote, reason, startMs: Math.max(0, Math.round(startMs)) };
    })
    .filter((item): item is InsightHighlightView => Boolean(item));
}

function readMetrics(metricsJson: Prisma.JsonValue): InsightMetricView {
  const metrics = readRecord(metricsJson);

  return {
    clarityScore: clampPercent(readNumber(metrics, "clarityScore")),
    fillerWordCount: readNumber(metrics, "fillerWordCount"),
    pacingNotes: readString(metrics, "pacingNotes"),
    pacingScore: clampPercent(readNumber(metrics, "pacingScore")),
    positiveReinforcementCount: readNumber(
      metrics,
      "positiveReinforcementCount"
    ),
    questionCount: readNumber(metrics, "questionCount"),
    studentTalkRatio: clampPercent(readNumber(metrics, "studentTalkRatio")),
    teacherTalkRatio: clampPercent(readNumber(metrics, "teacherTalkRatio")),
  };
}

function readSentiment(sentimentJson: Prisma.JsonValue): InsightSentimentView {
  const sentiment = readRecord(sentimentJson);

  return {
    confidence: readNumber(sentiment, "confidence"),
    correctionMoments: readNumber(sentiment, "correctionMoments"),
    overall: readString(sentiment, "overall") ?? "n/a",
    positiveMoments: readNumber(sentiment, "positiveMoments"),
  };
}

// This is the one conversion point from raw Prisma Insight JSON to report UI
// data. Keeping it here lets components stay focused on layout.
export function readInsightView(
  insight: InsightRecordForView | null | undefined
): InsightView | null {
  if (!insight) return null;

  const highlights = readHighlights(insight.highlightsJson);

  return {
    highlightStartMs: highlights.map((highlight) => highlight.startMs),
    highlights,
    heatmap: readHeatmap(insight.heatmapJson),
    illustrationKey: insight.illustrationKey,
    metrics: readMetrics(insight.metricsJson),
    recommendations: readRecommendations(insight.recommendations),
    sentiment: readSentiment(insight.sentimentJson),
    summary: insight.summary,
  };
}
