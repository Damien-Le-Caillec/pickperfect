-- CreateTable
CREATE TABLE "list_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "invitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT NOT NULL,
    CONSTRAINT "list_members_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "list_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdBy" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER NOT NULL DEFAULT 50,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invite_tokens_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "url" TEXT,
    "imageUrl" TEXT,
    "affiliateLink" TEXT,
    "affiliateId" TEXT,
    "commissionRate" REAL,
    "reserved" BOOLEAN NOT NULL DEFAULT false,
    "reservedById" TEXT,
    "reservedAt" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "items_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_items" ("affiliateId", "affiliateLink", "commissionRate", "createdAt", "currency", "description", "id", "imageUrl", "listId", "price", "priority", "reserved", "reservedAt", "reservedById", "title", "updatedAt", "url") SELECT "affiliateId", "affiliateLink", "commissionRate", "createdAt", "currency", "description", "id", "imageUrl", "listId", "price", "priority", "reserved", "reservedAt", "reservedById", "title", "updatedAt", "url" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE INDEX "items_listId_idx" ON "items"("listId");
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
    CONSTRAINT "lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_lists" ("budget", "createdAt", "description", "eventDate", "id", "privacy", "shareCount", "shareToken", "title", "updatedAt", "userId", "viewCount") SELECT "budget", "createdAt", "description", "eventDate", "id", "privacy", "shareCount", "shareToken", "title", "updatedAt", "userId", "viewCount" FROM "lists";
DROP TABLE "lists";
ALTER TABLE "new_lists" RENAME TO "lists";
CREATE UNIQUE INDEX "lists_shareToken_key" ON "lists"("shareToken");
CREATE INDEX "lists_userId_idx" ON "lists"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "list_members_listId_idx" ON "list_members"("listId");

-- CreateIndex
CREATE INDEX "list_members_userId_idx" ON "list_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "list_members_listId_userId_key" ON "list_members"("listId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- CreateIndex
CREATE INDEX "invite_tokens_token_idx" ON "invite_tokens"("token");
