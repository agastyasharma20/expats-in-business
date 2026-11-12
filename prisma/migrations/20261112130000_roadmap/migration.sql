DROP INDEX "Business_name_trgm_idx";


DROP INDEX "Profile_headline_trgm_idx";

DROP INDEX "Provider_name_trgm_idx";

DROP INDEX "user_name_trgm_idx";

-- AlterTable
ALTER TABLE "RoadmapTask" ADD COLUMN     "skipForCitizens" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserTask" ADD COLUMN     "remindedAt" TIMESTAMP(3);
