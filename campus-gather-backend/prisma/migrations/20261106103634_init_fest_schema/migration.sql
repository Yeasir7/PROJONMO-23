-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COORDINATOR', 'CONVENOR', 'CR', 'STUDENT');

-- CreateEnum
CREATE TYPE "TshirtSize" AS ENUM ('S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "FestFeeStatus" AS ENUM ('UNPAID', 'PAID_TO_CR');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "SegmentPaymentStatus" AS ENUM ('FREE', 'PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "InflowCategory" AS ENUM ('SPONSOR', 'DEPT_FUND', 'OTHER');

-- CreateTable
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "semester" INTEGER NOT NULL,
    "sectionName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "festFee" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "studentId" TEXT,
    "phone" TEXT,
    "tshirtSize" "TshirtSize" NOT NULL DEFAULT 'L',
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "sectionId" INTEGER,
    "festFeeStatus" "FestFeeStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "kitDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_handovers" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "crId" INTEGER NOT NULL,
    "receivedById" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "HandoverStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committees" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allocatedBudget" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "committees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_members" (
    "id" SERIAL NOT NULL,
    "committeeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "designation" TEXT NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "committee_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "committeeId" INTEGER NOT NULL,
    "spentById" INTEGER NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "voucherNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_inflows" (
    "id" SERIAL NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "category" "InflowCategory" NOT NULL DEFAULT 'SPONSOR',
    "amount" INTEGER NOT NULL,
    "receivedById" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_inflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "registrationFee" INTEGER NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER NOT NULL DEFAULT 50,
    "seatsLeft" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_registrations" (
    "id" SERIAL NOT NULL,
    "segmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamOrDetails" TEXT,
    "paymentStatus" "SegmentPaymentStatus" NOT NULL DEFAULT 'FREE',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sections_code_key" ON "sections"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_studentId_key" ON "users"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "committees_name_key" ON "committees"("name");

-- CreateIndex
CREATE UNIQUE INDEX "committee_members_committeeId_userId_key" ON "committee_members"("committeeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "segment_registrations_segmentId_userId_key" ON "segment_registrations"("segmentId", "userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_crId_fkey" FOREIGN KEY ("crId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_spentById_fkey" FOREIGN KEY ("spentById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_inflows" ADD CONSTRAINT "fund_inflows_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_registrations" ADD CONSTRAINT "segment_registrations_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_registrations" ADD CONSTRAINT "segment_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
