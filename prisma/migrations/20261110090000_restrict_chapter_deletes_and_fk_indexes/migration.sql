-- Review fix: deleting a chapter must never cascade into tickets, payments or sponsorships.
-- (The hand-written HNSW index on GuideChunk is intentionally kept; Prisma cannot see it.)
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "Venue" DROP CONSTRAINT "Venue_chapterId_fkey";

-- CreateIndex
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");

-- CreateIndex
CREATE INDEX "ChapterRequestVote_userId_idx" ON "ChapterRequestVote"("userId");

-- CreateIndex
CREATE INDEX "CheckIn_userId_idx" ON "CheckIn"("userId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Provider_ownerId_idx" ON "Provider"("ownerId");

-- CreateIndex
CREATE INDEX "QuoteRequest_requesterId_idx" ON "QuoteRequest"("requesterId");

-- CreateIndex
CREATE INDEX "Sponsorship_eventId_idx" ON "Sponsorship"("eventId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
