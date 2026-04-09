-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "year" INTEGER NOT NULL DEFAULT 1,
    "phase" TEXT NOT NULL DEFAULT 'TRADING',
    "timerEnd" TIMESTAMP(3),
    "timerRunning" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "motto" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "famousFor" TEXT NOT NULL,
    "food" INTEGER NOT NULL,
    "wealth" INTEGER NOT NULL,
    "environment" INTEGER NOT NULL,
    "kushBalls" INTEGER NOT NULL,
    "relationsData" TEXT NOT NULL,
    "promisesData" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "offerResource" TEXT NOT NULL,
    "offerAmount" INTEGER NOT NULL,
    "requestResource" TEXT NOT NULL,
    "requestAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "year" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scandal" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "outcome" TEXT,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scandal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScandalAlliance" (
    "id" TEXT NOT NULL,
    "scandalId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "side" TEXT NOT NULL,

    CONSTRAINT "ScandalAlliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromiseCheck" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "resource" TEXT NOT NULL,
    "required" INTEGER NOT NULL,
    "actual" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,

    CONSTRAINT "PromiseCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebriefResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "q1" TEXT NOT NULL,
    "q2" TEXT NOT NULL,
    "q3" TEXT NOT NULL,
    "q4" TEXT NOT NULL,
    "q5" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebriefResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scandal" ADD CONSTRAINT "Scandal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scandal" ADD CONSTRAINT "Scandal_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scandal" ADD CONSTRAINT "Scandal_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScandalAlliance" ADD CONSTRAINT "ScandalAlliance_scandalId_fkey" FOREIGN KEY ("scandalId") REFERENCES "Scandal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScandalAlliance" ADD CONSTRAINT "ScandalAlliance_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromiseCheck" ADD CONSTRAINT "PromiseCheck_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebriefResponse" ADD CONSTRAINT "DebriefResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebriefResponse" ADD CONSTRAINT "DebriefResponse_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
