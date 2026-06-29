-- CreateTable
CREATE TABLE "birthdays" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "relatedListId" TEXT,
    "remindDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "birthdays_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "secret_santas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "budget" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "secret_santas_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "secret_santa_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "secretSantaId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    CONSTRAINT "secret_santa_assignments_secretSantaId_fkey" FOREIGN KEY ("secretSantaId") REFERENCES "secret_santas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "secret_santa_assignments_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "secret_santa_assignments_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contributions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "birthdays_userId_idx" ON "birthdays"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "secret_santas_groupId_key" ON "secret_santas"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "secret_santa_assignments_secretSantaId_giverId_key" ON "secret_santa_assignments"("secretSantaId", "giverId");

-- CreateIndex
CREATE UNIQUE INDEX "contributions_itemId_userId_key" ON "contributions"("itemId", "userId");
