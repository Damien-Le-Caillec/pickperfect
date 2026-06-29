-- CreateTable
CREATE TABLE "list_views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "list_views_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "list_views_listId_idx" ON "list_views"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "list_views_listId_userId_key" ON "list_views"("listId", "userId");
