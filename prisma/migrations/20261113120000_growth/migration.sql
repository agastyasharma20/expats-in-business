-- CreateEnum
CREATE TYPE "AmbassadorScope" AS ENUM ('global', 'country', 'city');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('submitted', 'in_review', 'accepted', 'waitlisted', 'declined', 'withdrawn');

-- CreateEnum
CREATE TYPE "RoleKind" AS ENUM ('volunteer', 'internship', 'part_time', 'full_time');

-- CreateEnum
CREATE TYPE "RoleStatus" AS ENUM ('draft', 'open', 'closed');

-- AlterEnum
ALTER TYPE "RoleName" ADD VALUE 'ambassador';

-- DropIndex

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "tagline" TEXT;

-- CreateTable
CREATE TABLE "AmbassadorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "AmbassadorScope" NOT NULL,
    "countryCode" VARCHAR(2),
    "city" TEXT,
    "motivation" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "languages" TEXT[],
    "hoursPerMonth" INTEGER NOT NULL,
    "linkedinUrl" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'submitted',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbassadorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ambassador" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "AmbassadorScope" NOT NULL,
    "countryCode" VARCHAR(2),
    "city" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Ambassador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenRole" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "kind" "RoleKind" NOT NULL,
    "location" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "responsibilities" TEXT[],
    "requirements" TEXT[],
    "status" "RoleStatus" NOT NULL DEFAULT 'draft',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleApplication" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "portfolioUrl" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'submitted',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AmbassadorApplication_status_scope_idx" ON "AmbassadorApplication"("status", "scope");

-- CreateIndex
CREATE INDEX "AmbassadorApplication_userId_idx" ON "AmbassadorApplication"("userId");

-- CreateIndex
CREATE INDEX "Ambassador_scope_countryCode_idx" ON "Ambassador"("scope", "countryCode");

-- CreateIndex
CREATE INDEX "Ambassador_userId_idx" ON "Ambassador"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OpenRole_slug_key" ON "OpenRole"("slug");

-- CreateIndex
CREATE INDEX "OpenRole_status_kind_idx" ON "OpenRole"("status", "kind");

-- CreateIndex
CREATE INDEX "RoleApplication_status_idx" ON "RoleApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_roleId_userId_key" ON "RoleApplication"("roleId", "userId");

-- AddForeignKey
ALTER TABLE "AmbassadorApplication" ADD CONSTRAINT "AmbassadorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ambassador" ADD CONSTRAINT "Ambassador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OpenRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Integrity guards (the database rejects impossible values even if application code is wrong).
ALTER TABLE "AmbassadorApplication" ADD CONSTRAINT "AmbassadorApplication_hours_check" CHECK ("hoursPerMonth" BETWEEN 1 AND 160);
ALTER TABLE "AmbassadorApplication" ADD CONSTRAINT "AmbassadorApplication_scope_check" CHECK (
  ("scope" = 'global') OR
  ("scope" = 'country' AND "countryCode" IS NOT NULL) OR
  ("scope" = 'city' AND "countryCode" IS NOT NULL AND "city" IS NOT NULL)
);
-- One open application per member and tier (a second click or a scripted resubmit cannot duplicate it).
CREATE UNIQUE INDEX "AmbassadorApplication_open_per_scope" ON "AmbassadorApplication"("userId", "scope")
  WHERE "status" IN ('submitted', 'in_review');
ALTER TABLE "Ambassador" ADD CONSTRAINT "Ambassador_scope_check" CHECK (
  ("scope" = 'global') OR
  ("scope" = 'country' AND "countryCode" IS NOT NULL) OR
  ("scope" = 'city' AND "countryCode" IS NOT NULL AND "city" IS NOT NULL)
);
