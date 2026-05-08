-- AlterTable
ALTER TABLE "Scandal" ADD COLUMN     "beat" TEXT NOT NULL DEFAULT 'ALLIANCE',
ADD COLUMN     "beatEndsAt" TIMESTAMP(3),
ADD COLUMN     "currentRound" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "hitSide" TEXT;

-- CreateTable
CREATE TABLE "ScandalVolley" (
    "id" TEXT NOT NULL,
    "scandalId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "countryId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScandalVolley_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScandalVolley" ADD CONSTRAINT "ScandalVolley_scandalId_fkey" FOREIGN KEY ("scandalId") REFERENCES "Scandal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScandalVolley" ADD CONSTRAINT "ScandalVolley_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
