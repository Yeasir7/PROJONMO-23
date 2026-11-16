-- CreateTable
CREATE TABLE "allowed_students" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "allowed_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allowed_students_studentId_key" ON "allowed_students"("studentId");

-- CreateIndex
CREATE INDEX "cash_handovers_sectionId_idx" ON "cash_handovers"("sectionId");

-- CreateIndex
CREATE INDEX "cash_handovers_crId_idx" ON "cash_handovers"("crId");

-- CreateIndex
CREATE INDEX "cash_handovers_status_idx" ON "cash_handovers"("status");

-- CreateIndex
CREATE INDEX "cash_handovers_createdAt_idx" ON "cash_handovers"("createdAt");

-- CreateIndex
CREATE INDEX "expenses_committeeId_idx" ON "expenses"("committeeId");

-- CreateIndex
CREATE INDEX "expenses_spentById_idx" ON "expenses"("spentById");

-- CreateIndex
CREATE INDEX "expenses_createdAt_idx" ON "expenses"("createdAt");

-- CreateIndex
CREATE INDEX "fund_inflows_category_idx" ON "fund_inflows"("category");

-- CreateIndex
CREATE INDEX "fund_inflows_receivedById_idx" ON "fund_inflows"("receivedById");

-- CreateIndex
CREATE INDEX "fund_inflows_createdAt_idx" ON "fund_inflows"("createdAt");

-- CreateIndex
CREATE INDEX "segment_registrations_userId_idx" ON "segment_registrations"("userId");

-- CreateIndex
CREATE INDEX "segment_registrations_paymentStatus_idx" ON "segment_registrations"("paymentStatus");

-- CreateIndex
CREATE INDEX "segment_registrations_registeredAt_idx" ON "segment_registrations"("registeredAt");

-- CreateIndex
CREATE INDEX "users_sectionId_idx" ON "users"("sectionId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_festFeeStatus_idx" ON "users"("festFeeStatus");
