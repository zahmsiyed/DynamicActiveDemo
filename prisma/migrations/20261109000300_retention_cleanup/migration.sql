-- AlterTable
ALTER TABLE "Observation" ADD COLUMN     "deletingAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RecordingVersion" ADD COLUMN     "purgedAt" TIMESTAMP(3);

