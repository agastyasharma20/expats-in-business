-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('session', 'festival');

-- CreateEnum
CREATE TYPE "ProgrammeKind" AS ENUM ('performance', 'talk', 'workshop', 'food', 'family', 'exhibition', 'other');

-- CreateEnum
CREATE TYPE "StallCategory" AS ENUM ('food', 'crafts', 'culture', 'services', 'nonprofit', 'other');

-- CreateEnum
CREATE TYPE "StallStatus" AS ENUM ('submitted', 'accepted', 'waitlisted', 'declined', 'withdrawn');

-- DropIndex

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "kind" "EventKind" NOT NULL DEFAULT 'session',
ADD COLUMN     "maxPerOrder" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "stallFeeMinor" INTEGER,
ADD COLUMN     "stallsOpen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "volunteersOpen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TicketType" ADD COLUMN     "description" TEXT,
ADD COLUMN     "salesEndAt" TIMESTAMP(3),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EventProgrammeItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "ProgrammeKind" NOT NULL DEFAULT 'other',
    "stage" TEXT,
    "performer" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventProgrammeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerShift" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerSignup" (
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerSignup_pkey" PRIMARY KEY ("shiftId","userId")
);

-- CreateTable
CREATE TABLE "StallApplication" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "category" "StallCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "website" TEXT,
    "status" "StallStatus" NOT NULL DEFAULT 'submitted',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StallApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFaq" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventProgrammeItem_eventId_startsAt_idx" ON "EventProgrammeItem"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "VolunteerShift_eventId_idx" ON "VolunteerShift"("eventId");

-- CreateIndex
CREATE INDEX "VolunteerSignup_userId_idx" ON "VolunteerSignup"("userId");

-- CreateIndex
CREATE INDEX "StallApplication_eventId_status_idx" ON "StallApplication"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StallApplication_eventId_userId_key" ON "StallApplication"("eventId", "userId");

-- CreateIndex
CREATE INDEX "EventFaq_eventId_idx" ON "EventFaq"("eventId");

-- CreateIndex
CREATE INDEX "Event_kind_startsAt_idx" ON "Event"("kind", "startsAt");

-- AddForeignKey
ALTER TABLE "EventProgrammeItem" ADD CONSTRAINT "EventProgrammeItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerShift" ADD CONSTRAINT "VolunteerShift_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerSignup" ADD CONSTRAINT "VolunteerSignup_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "VolunteerShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerSignup" ADD CONSTRAINT "VolunteerSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StallApplication" ADD CONSTRAINT "StallApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StallApplication" ADD CONSTRAINT "StallApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFaq" ADD CONSTRAINT "EventFaq_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Integrity guards: the database rejects impossible values even if application code is wrong.
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_quantity_check" CHECK ("quantity" BETWEEN 1 AND 20);
ALTER TABLE "Event" ADD CONSTRAINT "Event_maxPerOrder_check" CHECK ("maxPerOrder" BETWEEN 1 AND 20);
ALTER TABLE "Event" ADD CONSTRAINT "Event_capacity_check" CHECK ("capacity" > 0);
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_price_check" CHECK ("priceMinor" >= 0);
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_capacity_check" CHECK ("capacity" IS NULL OR "capacity" > 0);
ALTER TABLE "VolunteerShift" ADD CONSTRAINT "VolunteerShift_capacity_check" CHECK ("capacity" > 0);
ALTER TABLE "VolunteerShift" ADD CONSTRAINT "VolunteerShift_time_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "EventProgrammeItem" ADD CONSTRAINT "EventProgrammeItem_time_check" CHECK ("endsAt" > "startsAt");
