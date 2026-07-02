-- AlterTable
ALTER TABLE "items" ADD COLUMN "receivedAt" DATETIME;
ALTER TABLE "items" ADD COLUMN "receivedNote" TEXT;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN "receivedAt" DATETIME;
ALTER TABLE "reservations" ADD COLUMN "receivedNote" TEXT;
