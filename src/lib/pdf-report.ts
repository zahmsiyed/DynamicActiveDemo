// This file creates a small, dependency-free PDF for one observation report.
// The app route can call it directly, so report export works anywhere the
// Next.js server can run.

import { evaluationCategoryLabels } from "@/lib/evaluation";
import { readInsightView } from "@/lib/insight-view";
import { type ObservationReport } from "@/lib/observations";
import { formatTranscriptRange } from "@/lib/transcripts";

const pageWidth = 612;
const pageHeight = 792;
const margin = 54;
const contentWidth = pageWidth - margin * 2;

type PdfFont = "F1" | "F2";

type PdfColor = [number, number, number];

const colors = {
  coral: [0.88, 0.27, 0.22] as PdfColor,
  ink: [0.17, 0.14, 0.12] as PdfColor,
  line: [0.86, 0.82, 0.76] as PdfColor,
  muted: [0.42, 0.39, 0.35] as PdfColor,
};

function formatDate(date: Date | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatScore(score: number) {
  return `${score.toFixed(1)}/5`;
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return sanitizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const normalized = sanitizePdfText(text);
  const words = normalized.split(" ").filter(Boolean);
  const maxCharacters = Math.max(16, Math.floor(maxWidth / (fontSize * 0.52)));
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length > maxCharacters && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [""];
}

class PdfDocumentBuilder {
  private pages: string[][] = [];
  private y = pageHeight - margin;

  constructor() {
    this.addPage();
  }

  private addPage() {
    this.pages.push([]);
    this.y = pageHeight - margin;
    this.text("Teacher Evaluation Studio", margin, 22, "F2", colors.coral);
    this.text("Classroom Observation Report", margin, 10, "F1", colors.muted);
    this.y -= 16;
    this.rule();
    this.y -= 12;
  }

  private get currentPage() {
    return this.pages[this.pages.length - 1];
  }

  private ensureSpace(height: number) {
    if (this.y - height < margin) {
      this.addPage();
    }
  }

  private setColor(color: PdfColor) {
    return `${color[0]} ${color[1]} ${color[2]} rg`;
  }

  private text(
    value: string,
    x: number,
    fontSize: number,
    font: PdfFont = "F1",
    color: PdfColor = colors.ink
  ) {
    const escaped = escapePdfText(value);

    this.currentPage.push(
      "BT",
      this.setColor(color),
      `/${font} ${fontSize} Tf`,
      `${x} ${this.y} Td`,
      `(${escaped}) Tj`,
      "ET"
    );
    this.y -= fontSize + 5;
  }

  private paragraph(
    value: string,
    options: {
      color?: PdfColor;
      font?: PdfFont;
      fontSize?: number;
      indent?: number;
      maxWidth?: number;
    } = {}
  ) {
    const fontSize = options.fontSize ?? 10;
    const indent = options.indent ?? 0;
    const maxWidth = options.maxWidth ?? contentWidth - indent;
    const lines = wrapText(value, maxWidth, fontSize);

    this.ensureSpace(lines.length * (fontSize + 5) + 4);

    for (const line of lines) {
      this.text(
        line,
        margin + indent,
        fontSize,
        options.font ?? "F1",
        options.color ?? colors.ink
      );
    }

    this.y -= 3;
  }

  private rule() {
    this.currentPage.push(
      `${colors.line[0]} ${colors.line[1]} ${colors.line[2]} RG`,
      `0.75 w`,
      `${margin} ${this.y} m`,
      `${pageWidth - margin} ${this.y} l`,
      "S"
    );
    this.y -= 8;
  }

  section(title: string) {
    this.ensureSpace(44);
    this.y -= 6;
    this.text(title, margin, 14, "F2", colors.ink);
    this.rule();
  }

  title(title: string, subtitle: string) {
    this.ensureSpace(78);
    this.text(title, margin, 20, "F2", colors.ink);
    this.paragraph(subtitle, { color: colors.muted, fontSize: 10 });
  }

  keyValue(label: string, value: string, x: number, width: number) {
    const startY = this.y;

    this.text(label.toUpperCase(), x, 7, "F2", colors.muted);
    this.y = startY - 13;
    this.paragraph(value, {
      font: "F2",
      fontSize: 10,
      maxWidth: width,
      indent: x - margin,
    });
  }

  metadata(items: { label: string; value: string }[]) {
    const columnWidth = contentWidth / 2 - 10;

    for (let index = 0; index < items.length; index += 2) {
      this.ensureSpace(50);
      const rowY = this.y;
      const left = items[index];
      const right = items[index + 1];

      this.keyValue(left.label, left.value, margin, columnWidth);

      if (right) {
        this.y = rowY;
        this.keyValue(
          right.label,
          right.value,
          margin + columnWidth + 20,
          columnWidth
        );
      }

      this.y = rowY - 42;
    }
  }

  bullet(text: string) {
    this.paragraph(`- ${text}`, { fontSize: 10, indent: 8 });
  }

  body(text: string) {
    this.paragraph(text, { fontSize: 10, color: colors.ink });
  }

  small(text: string) {
    this.paragraph(text, { fontSize: 9, color: colors.muted });
  }

  build() {
    const objects: string[] = [];

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

    const pageIds = this.pages.map((_page, index) => 5 + index * 2);

    objects[2] = `<< /Type /Pages /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${this.pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

    this.pages.forEach((pageCommands, index) => {
      const pageId = 5 + index * 2;
      const contentId = pageId + 1;
      const stream = pageCommands.join("\n");

      objects[pageId] = [
        "<< /Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${pageWidth} ${pageHeight}]`,
        "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >>",
        `/Contents ${contentId} 0 R`,
        ">>",
      ].join(" ");
      objects[contentId] = `<< /Length ${Buffer.byteLength(
        stream,
        "utf8"
      )} >>\nstream\n${stream}\nendstream`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    for (let index = 1; index < objects.length; index += 1) {
      offsets[index] = Buffer.byteLength(pdf, "utf8");
      pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefStart = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;

    for (let index = 1; index < objects.length; index += 1) {
      pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
    }

    pdf += [
      "trailer",
      `<< /Size ${objects.length} /Root 1 0 R >>`,
      "startxref",
      String(xrefStart),
      "%%EOF",
    ].join("\n");

    return Buffer.from(pdf, "utf8");
  }
}

// Build the exportable observation report PDF from the same Prisma result used
// by the report page.
export function buildObservationReportPdf(observation: ObservationReport) {
  const pdf = new PdfDocumentBuilder();
  const observedDate = observation.observedAt ?? observation.scheduledAt;
  const scores = observation.scores;
  const average =
    scores.reduce((sum, score) => sum + score.score, 0) /
    Math.max(1, scores.length);
  const insight = readInsightView(observation.insight);

  pdf.title(
    observation.title,
    `${observation.subject} - Grade ${observation.gradeLevel} - ${formatDate(
      observedDate
    )}`
  );

  pdf.metadata([
    { label: "Teacher", value: observation.teacher.name },
    { label: "Observer", value: observation.observer.name },
    { label: "School", value: observation.school.name },
    { label: "Status", value: observation.status },
    { label: "Average", value: formatScore(average) },
    { label: "Report date", value: formatDate(observedDate) },
  ]);

  pdf.section("Observation Summary");
  pdf.body(
    observation.summary ??
      "No narrative summary has been added to this observation yet."
  );

  pdf.section("Rubric Scores");
  for (const score of observation.scores) {
    pdf.bullet(
      `${evaluationCategoryLabels[score.category]}: ${score.score}/5${
        score.note ? ` - ${score.note}` : ""
      }`
    );
  }

  pdf.section("Written Feedback");
  if (observation.feedback.length) {
    for (const feedback of observation.feedback) {
      pdf.body(feedback.body);
      pdf.small(
        `Written by ${feedback.author.name}${
          feedback.author.title ? `, ${feedback.author.title}` : ""
        }`
      );
    }
  } else {
    pdf.body("No written feedback has been added yet.");
  }

  pdf.section("Transcript Evidence");
  if (observation.transcription?.segments.length) {
    for (const segment of observation.transcription.segments.slice(0, 8)) {
      pdf.bullet(
        `[${formatTranscriptRange(segment.startMs, segment.endMs)}] ${
          segment.speakerLabel
        }: ${segment.text}`
      );
    }

    if (observation.transcription.segments.length > 8) {
      pdf.small(
        `${observation.transcription.segments.length - 8} additional transcript segments are available in the app.`
      );
    }
  } else {
    pdf.body("No timestamped transcript is stored for this observation yet.");
  }

  pdf.section("AI Coaching Insight");
  if (insight) {
    pdf.body(insight.summary);
    pdf.bullet(`Teacher talk: ${insight.metrics.teacherTalkRatio}%`);
    pdf.bullet(`Student talk: ${insight.metrics.studentTalkRatio}%`);
    pdf.bullet(`Questions: ${insight.metrics.questionCount}`);
    pdf.bullet(`Pacing: ${insight.metrics.pacingScore}/100`);
    pdf.bullet(`Clarity: ${insight.metrics.clarityScore}/100`);

    for (const recommendation of insight.recommendations.slice(0, 3)) {
      pdf.bullet(
        `${recommendation.title} (${recommendation.priority}): ${recommendation.body}`
      );
    }
  } else {
    pdf.body("No AI insight has been generated for this report yet.");
  }

  pdf.section("Prototype Note");
  pdf.small(
    "Generated locally by the Teacher Evaluation Studio prototype. Simulated notifications and email logs are stored in SQLite for review."
  );

  return pdf.build();
}
