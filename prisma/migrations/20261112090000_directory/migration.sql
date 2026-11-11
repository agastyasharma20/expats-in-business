
-- AlterTable
ALTER TABLE "Connection" ADD COLUMN     "message" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "href" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderDailyStat" (
    "providerId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "quoteRequests" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProviderDailyStat_pkey" PRIMARY KEY ("providerId","day")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Profile_homeChapterId_industryId_idx" ON "Profile"("homeChapterId", "industryId");

-- CreateIndex
CREATE INDEX "Profile_openToCoffee_idx" ON "Profile"("openToCoffee");

-- CreateIndex
CREATE INDEX "Profile_languages_idx" ON "Profile" USING GIN ("languages");

-- CreateIndex
CREATE INDEX "Profile_skills_idx" ON "Profile" USING GIN ("skills");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderDailyStat" ADD CONSTRAINT "ProviderDailyStat_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigram name search (ILIKE '%term%' uses these indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "user_name_trgm_idx" ON "user" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Provider_name_trgm_idx" ON "Provider" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Business_name_trgm_idx" ON "Business" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Profile_headline_trgm_idx" ON "Profile" USING gin ("headline" gin_trgm_ops);
