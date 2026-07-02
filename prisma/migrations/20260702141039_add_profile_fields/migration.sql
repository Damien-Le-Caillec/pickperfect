-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "hashedPassword" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "avatarUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT 'peach',
    "bannerColor" TEXT NOT NULL DEFAULT 'gradient-peach-lavender',
    "birthDate" DATETIME,
    "profileViews" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_users" ("avatar", "banned", "createdAt", "email", "emailNotifications", "emailVerified", "hashedPassword", "id", "lastLoginAt", "loginCount", "name", "role", "unsubscribeToken", "updatedAt", "username") SELECT "avatar", "banned", "createdAt", "email", "emailNotifications", "emailVerified", "hashedPassword", "id", "lastLoginAt", "loginCount", "name", "role", "unsubscribeToken", "updatedAt", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_unsubscribeToken_key" ON "users"("unsubscribeToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
