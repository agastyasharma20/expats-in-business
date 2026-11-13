-- CreateEnum
CREATE TYPE "RouletteStatus" AS ENUM ('proposed', 'confirmed', 'declined');


-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "bubbleId" TEXT;

-- CreateTable
CREATE TABLE "RouletteOptIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouletteOptIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouletteRound" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouletteRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouletteMatch" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "status" "RouletteStatus" NOT NULL DEFAULT 'proposed',
    "cafe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouletteMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouletteMatchMember" (
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accepted" BOOLEAN,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "RouletteMatchMember_pkey" PRIMARY KEY ("matchId","userId")
);

-- CreateIndex
CREATE INDEX "RouletteOptIn_scopeKey_idx" ON "RouletteOptIn"("scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "RouletteOptIn_userId_scopeKey_key" ON "RouletteOptIn"("userId", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "RouletteRound_scopeKey_weekStart_key" ON "RouletteRound"("scopeKey", "weekStart");

-- CreateIndex
CREATE INDEX "RouletteMatchMember_userId_idx" ON "RouletteMatchMember"("userId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_bubbleId_fkey" FOREIGN KEY ("bubbleId") REFERENCES "Bubble"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouletteOptIn" ADD CONSTRAINT "RouletteOptIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouletteMatch" ADD CONSTRAINT "RouletteMatch_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RouletteRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouletteMatchMember" ADD CONSTRAINT "RouletteMatchMember_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "RouletteMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouletteMatchMember" ADD CONSTRAINT "RouletteMatchMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Moderation, suspension and admin settings
ALTER TABLE "user" ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedReason" TEXT;

ALTER TABLE "Post" ADD COLUMN "removedAt" TIMESTAMP(3);

ALTER TABLE "PostReport" ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolvedById" TEXT;

CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "PostReport_status_idx" ON "PostReport"("status");

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
