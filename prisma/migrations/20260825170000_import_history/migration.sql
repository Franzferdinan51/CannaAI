-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imported" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ImportHistory_createdAt_idx" ON "ImportHistory"("createdAt");
