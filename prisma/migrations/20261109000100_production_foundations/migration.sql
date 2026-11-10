-- CreateEnum
CREATE TYPE "RunState" AS ENUM ('QUEUED', 'TRANSCRIBING', 'ANALYZING', 'READY', 'FAILED', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "District" ADD COLUMN     "policyVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recordingRetentionDays" INTEGER,
ADD COLUMN     "reportRetentionDays" INTEGER,
ADD COLUMN     "transcriptRetentionDays" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "authId" UUID,
ALTER COLUMN "passwordHash" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Observation" ADD COLUMN     "recordingVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RecordingVersion" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecordingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "inputVersion" INTEGER NOT NULL,
    "rubricVersion" TEXT NOT NULL DEFAULT 'v1',
    "state" "RunState" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "transcript" JSONB,
    "analysis" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageAttempt" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorCode" TEXT,

    CONSTRAINT "StageAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportRevision" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT NOT NULL,

    CONSTRAINT "ReportRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
    "id" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecordingVersion_storagePath_key" ON "RecordingVersion"("storagePath");

-- CreateIndex
CREATE INDEX "EvaluationRun_state_leaseUntil_idx" ON "EvaluationRun"("state", "leaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationRun_recordingId_rubricVersion_key" ON "EvaluationRun"("recordingId", "rubricVersion");

-- CreateIndex
CREATE INDEX "AuditEvent_districtId_createdAt_idx" ON "AuditEvent"("districtId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "School_id_districtId_key" ON "School"("id", "districtId");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_schoolId_districtId_key" ON "User"("id", "schoolId", "districtId");

-- AddForeignKey
ALTER TABLE "RecordingVersion" ADD CONSTRAINT "RecordingVersion_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "RecordingVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageAttempt" ADD CONSTRAINT "StageAttempt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "EvaluationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRevision" ADD CONSTRAINT "ReportRevision_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Preserve the hierarchy even if a future code path omits a scope check.
ALTER TABLE "User" ADD CONSTRAINT "User_school_district_fkey"
  FOREIGN KEY ("schoolId", "districtId") REFERENCES "School" (id, "districtId");
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_school_district_fkey"
  FOREIGN KEY ("schoolId", "districtId") REFERENCES "School" (id, "districtId");
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_teacher_scope_fkey"
  FOREIGN KEY ("teacherId", "schoolId", "districtId") REFERENCES "User" (id, "schoolId", "districtId");
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_observer_scope_fkey"
  FOREIGN KEY ("observerId", "schoolId", "districtId") REFERENCES "User" (id, "schoolId", "districtId");
ALTER TABLE "User" ADD CONSTRAINT "User_membership_check" CHECK (
  "districtId" IS NOT NULL AND (role = 'DISTRICT_ADMIN' OR "schoolId" IS NOT NULL)
);
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_range" CHECK (score BETWEEN 1 AND 5);
ALTER TABLE "District" ADD CONSTRAINT "District_retention_range" CHECK (
  ("recordingRetentionDays" IS NULL OR "recordingRetentionDays" BETWEEN 1 AND 3650) AND
  ("transcriptRetentionDays" IS NULL OR "transcriptRetentionDays" BETWEEN 1 AND 3650) AND
  ("reportRetentionDays" IS NULL OR "reportRetentionDays" BETWEEN 1 AND 3650)
);

-- Auth clients use only Auth/Storage APIs. Application tables are server-only.
-- RLS blocks Data API access; restricted server roles receive explicit grants.
DO $$ DECLARE row record; BEGIN
  FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', row.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', row.tablename);
  END LOOP;
END $$;
