-- CreateTable
CREATE TABLE "BreedingCross" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "generation" TEXT,
    "motherStrainId" TEXT,
    "motherPlantId" TEXT,
    "fatherStrainId" TEXT,
    "fatherPlantId" TEXT,
    "fatherDescription" TEXT,
    "resultingStrainId" TEXT,
    "crossDate" DATETIME,
    "seedsHarvested" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BreedingCross_motherStrainId_fkey" FOREIGN KEY ("motherStrainId") REFERENCES "Strain" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BreedingCross_motherPlantId_fkey" FOREIGN KEY ("motherPlantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BreedingCross_fatherStrainId_fkey" FOREIGN KEY ("fatherStrainId") REFERENCES "Strain" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BreedingCross_fatherPlantId_fkey" FOREIGN KEY ("fatherPlantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BreedingCross_resultingStrainId_fkey" FOREIGN KEY ("resultingStrainId") REFERENCES "Strain" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BreedingCross_motherStrainId_idx" ON "BreedingCross"("motherStrainId");
CREATE INDEX "BreedingCross_fatherStrainId_idx" ON "BreedingCross"("fatherStrainId");
CREATE INDEX "BreedingCross_resultingStrainId_idx" ON "BreedingCross"("resultingStrainId");
CREATE INDEX "BreedingCross_crossDate_idx" ON "BreedingCross"("crossDate");
