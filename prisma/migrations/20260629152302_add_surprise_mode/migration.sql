-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "privacy" TEXT NOT NULL DEFAULT 'UNLISTED',
    "eventDate" DATETIME,
    "budget" REAL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "shareToken" TEXT,
    "collaborative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "surpriseMode" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_lists" ("budget", "collaborative", "createdAt", "description", "eventDate", "id", "privacy", "shareCount", "shareToken", "title", "updatedAt", "userId", "viewCount") SELECT "budget", "collaborative", "createdAt", "description", "eventDate", "id", "privacy", "shareCount", "shareToken", "title", "updatedAt", "userId", "viewCount" FROM "lists";
DROP TABLE "lists";
ALTER TABLE "new_lists" RENAME TO "lists";
CREATE UNIQUE INDEX "lists_shareToken_key" ON "lists"("shareToken");
CREATE INDEX "lists_userId_idx" ON "lists"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
