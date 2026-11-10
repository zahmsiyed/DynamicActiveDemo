// Boundary tests exercise invalid provider evidence and fail-closed access rules.
import test from "node:test";
import assert from "node:assert/strict";
import { observationScope, canEdit } from "../../src/lib/access";
import { analysisSchema, validateAnalysis, retryDelay, categories } from "../../src/lib/jobs/contracts";
import { hasExpectedAudioContainerSignature, maxAudioUploadBytes, validateAudioUploadFile } from "../../src/lib/media";
const teacher = { id: "teacher", role: "TEACHER" as const, districtId: "district", schoolId: "school" };
test("teacher lists require own finalized records in current district", () => {
  assert.deepEqual(observationScope(teacher), { districtId: "district", teacherId: "teacher", status: "FINALIZED" });
});
test("missing tenant fails closed", () => assert.deepEqual(observationScope({ ...teacher, districtId: null }), { id: "__denied__" }));
test("school mutation requires district and school", () => {
  const admin = { ...teacher, role: "SCHOOL_ADMIN" as const };
  assert.equal(canEdit(admin, { districtId: "other", schoolId: "school" }), false);
  assert.equal(canEdit(admin, { districtId: "district", schoolId: "other" }), false);
  assert.equal(canEdit(admin, { districtId: "district", schoolId: "school" }), true);
});
test("teachers cannot mutate observations", () => assert.equal(canEdit(teacher, { districtId: "district", schoolId: "school" }), false));
test("retry intervals grow and remain bounded", () => {
  assert.equal(retryDelay(1, () => 0), 5); assert.equal(retryDelay(5, () => 0), 80);
  assert.equal(retryDelay(100, () => 0.99), 904);
});
test("upload validation rejects empty and oversized media", () => {
  assert.equal(validateAudioUploadFile(new File([], "empty.wav", { type: "audio/wav" })).ok, false);
  assert.equal(validateAudioUploadFile({ size: maxAudioUploadBytes + 1, type: "audio/wav" } as File).ok, false);
});
test("HTML disguised as WAV fails signature validation", () => assert.equal(hasExpectedAudioContainerSignature(Buffer.from("<html>recording</html>"), "audio/wav"), false));
// All required coaching fields are populated so only evidence/category validation fails.
const insight = {
  summary: "Review", metrics: { teacherTalkRatio: 50, studentTalkRatio: 50, questionCount: 1, fillerWordCount: 0, positiveReinforcementCount: 0, pacingScore: 50, clarityScore: 50, pacingNotes: "Review evidence." },
  recommendations: [], sentiment: { overall: "neutral", positiveMoments: 0, correctionMoments: 0, confidence: 0.5 }, heatmap: [], highlights: [], illustrationKey: "CLARITY_STEPS",
};
const transcript = { provider: "fixture", model: "fixture", text: "How do you know?", segments: [{ speakerLabel: "A", startMs: 0, endMs: 1000, text: "How do you know?" }] };
function result() { return { model: "fixture", insight, suggestions: categories.map(category => ({ category, score: 3 as number | null, rationale: "Evidence", evidence: [{ segmentIndex: 0, quote: "How do you know?" }] })) }; }
test("accepts grounded scores", () => assert.equal(validateAnalysis(result(), transcript).suggestions.length, 6));
test("rejects repeated rubric category", () => { const value = result(); value.suggestions[1].category = value.suggestions[0].category; assert.throws(() => validateAnalysis(value, transcript)); });
test("rejects invented quotes and invalid segment indexes", () => {
  const value = result(); value.suggestions[0].evidence[0].quote = "Invented quote";
  assert.throws(() => validateAnalysis(value, transcript));
  value.suggestions[0].evidence[0] = { quote: "How do you know?", segmentIndex: 3 };
  assert.throws(() => validateAnalysis(value, transcript));
});
test("insufficient evidence can remain unscored", () => {
  const value = result(); value.suggestions[0].score = null; value.suggestions[0].evidence = [];
  assert.equal(validateAnalysis(value, transcript).suggestions[0].score, null);
});
test("scored categories require evidence", () => { const value = result(); value.suggestions[0].evidence = []; assert.throws(() => validateAnalysis(value, transcript)); });
test("out-of-range scores fail schema", () => { const value = result(); value.suggestions[0].score = 6; assert.equal(analysisSchema.safeParse(value).success, false); });
