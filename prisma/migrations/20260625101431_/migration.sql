-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "sessions" ADD COLUMN "lastUsedAt" DATETIME;
ALTER TABLE "sessions" ADD COLUMN "userAgent" TEXT;
