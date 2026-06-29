-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_points" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "availablePoints" INTEGER NOT NULL DEFAULT 0,
    "spentPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "nextLevelExp" INTEGER NOT NULL DEFAULT 100,
    "lastDailyLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "user_points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_points" ("availablePoints", "createdAt", "experience", "id", "lastDailyLogin", "level", "nextLevelExp", "spentPoints", "totalPoints", "updatedAt", "userId") SELECT "availablePoints", "createdAt", "experience", "id", "lastDailyLogin", "level", "nextLevelExp", "spentPoints", "totalPoints", "updatedAt", "userId" FROM "user_points";
DROP TABLE "user_points";
ALTER TABLE "new_user_points" RENAME TO "user_points";
CREATE UNIQUE INDEX "user_points_userId_key" ON "user_points"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
