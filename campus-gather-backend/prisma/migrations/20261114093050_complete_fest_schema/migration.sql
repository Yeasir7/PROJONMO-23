-- CreateEnum
CREATE TYPE "ParticipationType" AS ENUM ('SOLO', 'TEAM');

-- AlterTable
ALTER TABLE "sections" ALTER COLUMN "festFee" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "segments" ADD COLUMN     "description" TEXT,
ADD COLUMN     "participationType" "ParticipationType" NOT NULL DEFAULT 'SOLO';
