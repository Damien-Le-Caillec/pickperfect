-- AlterTable
ALTER TABLE "secret_santa_assignments" ADD COLUMN "wishedFilledAt" DATETIME;

-- CreateTable
CREATE TABLE "secret_santa_wishes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "secret_santa_wishes_assignId_fkey" FOREIGN KEY ("assignId") REFERENCES "secret_santa_assignments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
