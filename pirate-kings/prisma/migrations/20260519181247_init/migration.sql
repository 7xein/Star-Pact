-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('LOBBY', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'STRANDED', 'SHIPWRECKED', 'FINISHED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('WATER', 'PROVISIONS', 'RIGGING', 'SPYGLASS', 'TREASURE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('HOME_PORT', 'TREASURE_ISLAND', 'TRADING_POST', 'FRIENDLY_COVE', 'KRAKEN_LAIR', 'OPEN_SEA');

-- CreateEnum
CREATE TYPE "WeatherZone" AS ENUM ('SAFE', 'KRAKEN', 'OPEN_SEA');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'CONSUME');

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'LOBBY',
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "timerEnd" TIMESTAMP(3),
    "timerRunning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "doubloons" INTEGER NOT NULL DEFAULT 1000,
    "cargoCapacity" INTEGER NOT NULL DEFAULT 1000,
    "currentLocationId" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "lostUntilDay" INTEGER,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "totalWeight" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "weather" TEXT NOT NULL,
    "provisionsConsumed" INTEGER NOT NULL DEFAULT 0,
    "waterConsumed" INTEGER NOT NULL DEFAULT 0,
    "riggingUsed" BOOLEAN NOT NULL DEFAULT false,
    "spyglassUsed" BOOLEAN NOT NULL DEFAULT false,
    "treasureEarned" INTEGER NOT NULL DEFAULT 0,
    "wasLost" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapLocation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "weatherZone" "WeatherZone" NOT NULL,

    CONSTRAINT "MapLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherSchedule" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dayData" JSONB NOT NULL,

    CONSTRAINT "WeatherSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost" INTEGER,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_joinCode_key" ON "Team"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_teamId_resourceType_key" ON "Inventory"("teamId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "MapLocation_sessionId_gridX_gridY_key" ON "MapLocation"("sessionId", "gridX", "gridY");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherSchedule_sessionId_key" ON "WeatherSchedule"("sessionId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "MapLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapLocation" ADD CONSTRAINT "MapLocation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherSchedule" ADD CONSTRAINT "WeatherSchedule_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
