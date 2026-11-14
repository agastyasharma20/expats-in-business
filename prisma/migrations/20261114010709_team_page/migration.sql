-- DropIndex
DROP INDEX "GuideChunk_embedding_hnsw_idx";

-- CreateTable
CREATE TABLE "FounderMessage" (
    "key" TEXT NOT NULL DEFAULT 'founder',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "founderName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "photo" BYTEA,
    "photoType" TEXT,
    "photoAlt" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderMessage_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "grp" TEXT NOT NULL DEFAULT 'team',
    "bio" TEXT,
    "photo" BYTEA,
    "photoType" TEXT,
    "photoAlt" TEXT,
    "photoVersion" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "linkedinUrl" TEXT,
    "email" TEXT,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMember_isVisible_grp_sortOrder_idx" ON "TeamMember"("isVisible", "grp", "sortOrder");
