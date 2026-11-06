-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('live', 'launching', 'requested');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "defaultCurrency" VARCHAR(3) NOT NULL,
    "defaultTimezone" TEXT NOT NULL,
    "locales" TEXT[],
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "timezone" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "locales" TEXT[],
    "status" "ChapterStatus" NOT NULL DEFAULT 'requested',
    "launchedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_slug_key" ON "Chapter"("slug");

-- CreateIndex
CREATE INDEX "Chapter_countryCode_idx" ON "Chapter"("countryCode");

-- CreateIndex
CREATE INDEX "Chapter_status_idx" ON "Chapter"("status");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
