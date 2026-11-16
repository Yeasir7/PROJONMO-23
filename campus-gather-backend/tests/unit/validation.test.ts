import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import all validations
import { registerStudentZodSchema, loginZodSchema, refreshTokenZodSchema, forgotPasswordZodSchema } from "../../src/app/modules/auth/auth.validation.js";
import { UserValidation } from "../../src/app/modules/user/user.validation.js";
import { SectionValidation } from "../../src/app/modules/section/section.validation.js";
import { CommitteeValidation } from "../../src/app/modules/committee/committee.validation.js";
import { CashHandoverValidation } from "../../src/app/modules/cash-handover/cash-handover.validation.js";
import { ExpenseValidation } from "../../src/app/modules/expense/expense.validation.js";
import { FundInflowValidation } from "../../src/app/modules/fund-inflow/fund-inflow.validation.js";
import { SegmentValidation } from "../../src/app/modules/segment/segment.validation.js";
import { SegmentRegistrationValidation } from "../../src/app/modules/segment-registration/segment-registration.validation.js";

describe("Validation Schemas Suite", () => {
    describe("Auth Validation", () => {
        it("should validate valid student registration payload", () => {
            const valid = {
                name: "Rahim Ahmed",
                email: "rahim@cse.edu",
                password: "Password123",
                studentId: "11230121001",
                phone: "01711111111",
                sectionId: 1,
                tshirtSize: "L",
            };
            const result = registerStudentZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject student registration with invalid email", () => {
            const invalid = {
                name: "Rahim Ahmed",
                email: "not-an-email",
                password: "Password123",
                studentId: "11230121001",
                phone: "01711111111",
                sectionId: 1,
                tshirtSize: "L",
            };
            const result = registerStudentZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should reject student registration with short password (< 6 chars)", () => {
            const invalid = {
                name: "Rahim Ahmed",
                email: "rahim@cse.edu",
                password: "123",
                studentId: "11230121001",
                phone: "01711111111",
                sectionId: 1,
                tshirtSize: "M",
            };
            const result = registerStudentZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should reject student registration with invalid tshirt size", () => {
            const invalid = {
                name: "Rahim Ahmed",
                email: "rahim@cse.edu",
                password: "Password123",
                studentId: "11230121001",
                phone: "01711111111",
                sectionId: 1,
                tshirtSize: "EXTRA_LARGE",
            };
            const result = registerStudentZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should validate valid login payload", () => {
            const valid = { email: "user@cse.edu", password: "Password123" };
            const result = loginZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject login with empty password", () => {
            const invalid = { email: "user@cse.edu", password: "" };
            const result = loginZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should validate refresh token schema with token or empty body", () => {
            const withToken = { refreshToken: "valid.jwt.token" };
            assert.equal(refreshTokenZodSchema.safeParse(withToken).success, true);

            const emptyBody = {};
            assert.equal(refreshTokenZodSchema.safeParse(emptyBody).success, true);
        });

        it("should validate valid forgot password payload", () => {
            const valid = { identifier: "11230121177" };
            assert.equal(forgotPasswordZodSchema.safeParse(valid).success, true);

            const validEmail = { identifier: "student@csefest.com" };
            assert.equal(forgotPasswordZodSchema.safeParse(validEmail).success, true);
        });

        it("should reject forgot password with empty identifier", () => {
            const invalid = { identifier: "" };
            assert.equal(forgotPasswordZodSchema.safeParse(invalid).success, false);
        });
    });

    describe("User Validation", () => {
        it("should validate valid user role update", () => {
            const valid = { role: "CONVENOR" };
            const result = UserValidation.updateUserRoleZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject invalid role enum", () => {
            const invalid = { role: "HACKER" };
            const result = UserValidation.updateUserRoleZodSchema.safeParse(invalid);
            assert.equal(result.success, false);

            const invalidCoordinator = { role: "COORDINATOR" };
            const coordinatorResult = UserValidation.updateUserRoleZodSchema.safeParse(invalidCoordinator);
            assert.equal(coordinatorResult.success, false);
        });

        it("should validate valid fee status update with paidAmount", () => {
            const valid = { festFeeStatus: "PAID_TO_CR", paidAmount: 1000 };
            const result = UserValidation.updateFeeStatusZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should validate fee status update without paidAmount", () => {
            const valid = { festFeeStatus: "UNPAID" };
            const result = UserValidation.updateFeeStatusZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject invalid fee status enum", () => {
            const invalid = { festFeeStatus: "WAIVED" };
            const result = UserValidation.updateFeeStatusZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should validate kit delivery status", () => {
            const valid = { kitDelivered: true };
            const result = UserValidation.updateKitStatusZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject non-boolean kit delivery status", () => {
            const invalid = { kitDelivered: "yes" };
            const result = UserValidation.updateKitStatusZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should validate valid updateMyProfile payload", () => {
            const valid = {
                email: "updated@student.edu",
                phone: "01812345678",
                tshirtSize: "XL",
                sectionId: 3,
                newPassword: "newsecurepassword123",
            };
            const result = UserValidation.updateMyProfileZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject updateMyProfile with invalid email", () => {
            const invalid = { email: "not-an-email" };
            const result = UserValidation.updateMyProfileZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should reject updateMyProfile with short phone or newPassword", () => {
            const invalidPhone = { phone: "123" };
            assert.equal(UserValidation.updateMyProfileZodSchema.safeParse(invalidPhone).success, false);

            const invalidPass = { newPassword: "123" };
            assert.equal(UserValidation.updateMyProfileZodSchema.safeParse(invalidPass).success, false);
        });

        it("should reject updateMyProfile with invalid tshirtSize", () => {
            const invalidSize = { tshirtSize: "XXXL" };
            assert.equal(UserValidation.updateMyProfileZodSchema.safeParse(invalidSize).success, false);
        });
    });

    describe("Section Validation", () => {
        it("should validate valid section creation payload", () => {
            const valid = {
                semester: 8,
                sectionName: "A",
                code: "8A",
                festFee: 1500,
            };
            const result = SectionValidation.createSectionZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject section with non-integer semester", () => {
            const invalid = {
                semester: 8.5,
                sectionName: "A",
                code: "8A",
            };
            const result = SectionValidation.createSectionZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should allow partial section update", () => {
            const valid = { festFee: 1200 };
            const result = SectionValidation.updateSectionZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });
    });

    describe("Committee Validation", () => {
        it("should validate valid committee creation payload", () => {
            const valid = {
                name: "Programming Contest",
                description: "Organizes speed coding contest",
                allocatedBudget: 25000,
            };
            const result = CommitteeValidation.createCommitteeZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject empty committee name", () => {
            const invalid = { name: "" };
            const result = CommitteeValidation.createCommitteeZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });

        it("should validate add member payload", () => {
            const valid = { userId: 5, designation: "LEAD" };
            const result = CommitteeValidation.addMemberZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject invalid member designation", () => {
            const invalid = { userId: 5, designation: "PRESIDENT" };
            const result = CommitteeValidation.addMemberZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });
    });

    describe("Cash Handover Validation", () => {
        it("should validate valid handover creation", () => {
            const valid = {
                receivedById: 2,
                amount: 15000,
                notes: "Collected from section 8A",
            };
            const result = CashHandoverValidation.createHandoverZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject handover with zero or negative amount", () => {
            const invalid = { receivedById: 2, amount: 0 };
            const result = CashHandoverValidation.createHandoverZodSchema.safeParse(invalid);
            assert.equal(result.success, false);

            const negative = { receivedById: 2, amount: -500 };
            const resultNeg = CashHandoverValidation.createHandoverZodSchema.safeParse(negative);
            assert.equal(resultNeg.success, false);
        });

        it("should accept empty or valid verify body", () => {
            const empty = {};
            const resultEmpty = CashHandoverValidation.verifyHandoverZodSchema.safeParse(empty);
            assert.equal(resultEmpty.success, true);

            const valid = { status: "VERIFIED" };
            const resultValid = CashHandoverValidation.verifyHandoverZodSchema.safeParse(valid);
            assert.equal(resultValid.success, true);
        });
    });

    describe("Expense Validation", () => {
        it("should validate valid expense creation", () => {
            const valid = {
                committeeId: 1,
                itemTitle: "Stage Banners",
                amount: 8000,
                voucherNote: "Voucher #42",
            };
            const result = ExpenseValidation.createExpenseZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject expense with non-integer or zero amount", () => {
            const invalid = { committeeId: 1, itemTitle: "Snacks", amount: 0 };
            const result = ExpenseValidation.createExpenseZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });
    });

    describe("Fund Inflow Validation", () => {
        it("should validate valid fund inflow", () => {
            const valid = {
                sourceTitle: "Tech Corp Sponsorship",
                category: "SPONSOR",
                amount: 50000,
                notes: "Title Sponsor 2026",
            };
            const result = FundInflowValidation.createInflowZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject invalid inflow category", () => {
            const invalid = {
                sourceTitle: "Donation",
                category: "CRYPTOCURRENCY",
                amount: 5000,
            };
            const result = FundInflowValidation.createInflowZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });
    });

    describe("Segment & Registration Validation", () => {
        it("should validate valid segment creation", () => {
            const valid = {
                title: "Speed Coding",
                category: "Programming",
                registrationFee: 200,
                maxCapacity: 60,
            };
            const result = SegmentValidation.createSegmentZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should validate segment registration payload", () => {
            const valid = { segmentId: 1, teamOrDetails: "Team Bitwise" };
            const result = SegmentRegistrationValidation.createRegistrationZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should validate registration payment status update", () => {
            const valid = { paymentStatus: "PAID" };
            const result = SegmentRegistrationValidation.updatePaymentStatusZodSchema.safeParse(valid);
            assert.equal(result.success, true);
        });

        it("should reject invalid registration payment status", () => {
            const invalid = { paymentStatus: "REFUNDED" };
            const result = SegmentRegistrationValidation.updatePaymentStatusZodSchema.safeParse(invalid);
            assert.equal(result.success, false);
        });
    });
});
