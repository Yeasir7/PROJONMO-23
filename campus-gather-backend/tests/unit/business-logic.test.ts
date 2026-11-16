import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import status from "http-status";
import { FestFeeStatus, HandoverStatus, Role, SegmentPaymentStatus } from "@prisma/client";

import { prisma } from "../../src/app/lib/prisma.js";
import { AuthService } from "../../src/app/modules/auth/auth.service.js";
import { UserService } from "../../src/app/modules/user/user.service.js";
import { SectionService } from "../../src/app/modules/section/section.service.js";
import { SegmentService } from "../../src/app/modules/segment/segment.service.js";
import { CashHandoverService } from "../../src/app/modules/cash-handover/cash-handover.service.js";
import { SegmentRegistrationService } from "../../src/app/modules/segment-registration/segment-registration.service.js";
import { CommitteeService } from "../../src/app/modules/committee/committee.service.js";
import { ExpenseService } from "../../src/app/modules/expense/expense.service.js";
import AppError from "../../src/app/errorHelpers/AppError.js";
import { mockUsers } from "../helpers/jwt.helper.js";

describe("Core Business Logic & Security Boundary Suite", () => {
    describe("CR Section Boundary Security Lock", () => {
        it("should force sectionId to CR's section when CR calls getAllUsers, ignoring spoofed query params", async () => {
            let capturedWhere: any = null;
            // Stub prisma.user.findMany
            const originalFindMany = prisma.user.findMany;
            (prisma.user as any).findMany = async (args: any) => {
                capturedWhere = args.where;
                return [];
            };

            try {
                // CR belonging to section 1 attempts to query section 2
                await UserService.getAllUsers(mockUsers.crSection1, { sectionId: "2" });

                assert.ok(capturedWhere);
                // Security check: Must be locked to CR's section 1, NOT the requested section 2
                assert.equal(capturedWhere.sectionId, mockUsers.crSection1.sectionId);
            } finally {
                (prisma.user as any).findMany = originalFindMany;
            }
        });

        it("should allow Super Admin to query any requested sectionId in getAllUsers", async () => {
            let capturedWhere: any = null;
            const originalFindMany = prisma.user.findMany;
            (prisma.user as any).findMany = async (args: any) => {
                capturedWhere = args.where;
                return [];
            };

            try {
                await UserService.getAllUsers(mockUsers.superAdmin, { sectionId: "5" });
                assert.ok(capturedWhere);
                assert.equal(capturedWhere.sectionId, 5);
            } finally {
                (prisma.user as any).findMany = originalFindMany;
            }
        });

        it("should forbid CR from updating fee-status of a student in a different section", async () => {
            const originalFindUnique = prisma.user.findUnique;
            // Target student belongs to section 2
            (prisma.user as any).findUnique = async () => ({
                id: 99,
                sectionId: 2,
            });

            try {
                // CR from section 1 attempts update
                await assert.rejects(
                    async () => {
                        await UserService.updateFeeStatus(
                            99,
                            { festFeeStatus: "PAID_TO_CR", paidAmount: 1000 },
                            mockUsers.crSection1
                        );
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.FORBIDDEN);
                        assert.match(err.message, /only update fee status for students in your section/i);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findUnique = originalFindUnique;
            }
        });

        it("should forbid CR from viewing details of a user in a different section", async () => {
            const originalFindUnique = prisma.user.findUnique;
            (prisma.user as any).findUnique = async () => ({
                id: 105,
                sectionId: 2,
                password: "hash",
            });

            try {
                await assert.rejects(
                    async () => {
                        await UserService.getUserById(105, mockUsers.crSection1);
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.FORBIDDEN);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findUnique = originalFindUnique;
            }
        });

        it("should lock cash handover query to CR's section", async () => {
            let capturedWhere: any = null;
            const originalFindMany = prisma.cashHandover.findMany;
            (prisma.cashHandover as any).findMany = async (args: any) => {
                capturedWhere = args.where;
                return [];
            };

            try {
                await CashHandoverService.getAllHandovers(mockUsers.crSection1, { sectionId: "9" });
                assert.ok(capturedWhere);
                assert.equal(capturedWhere.sectionId, mockUsers.crSection1.sectionId);
            } finally {
                (prisma.cashHandover as any).findMany = originalFindMany;
            }
        });
    });

    describe("Segment Registration Business Rules", () => {
        it("should reject registration when segment has no seats left (seatsLeft <= 0)", async () => {
            const originalFindUnique = prisma.segment.findUnique;
            (prisma.segment as any).findUnique = async () => ({
                id: 1,
                seatsLeft: 0,
                registrationFee: 100,
            });

            const originalRegFind = prisma.segmentRegistration.findUnique;
            (prisma.segmentRegistration as any).findUnique = async () => null;

            try {
                await assert.rejects(
                    async () => {
                        await SegmentRegistrationService.registerForSegment(10, { segmentId: 1 });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /No seats (available|left)/i);
                        return true;
                    }
                );
            } finally {
                (prisma.segment as any).findUnique = originalFindUnique;
                (prisma.segmentRegistration as any).findUnique = originalRegFind;
            }
        });

        it("should reject duplicate registration with 409 Conflict", async () => {
            const originalSegmentFind = prisma.segment.findUnique;
            (prisma.segment as any).findUnique = async () => ({
                id: 1,
                seatsLeft: 20,
                registrationFee: 0,
            });

            const originalRegFind = prisma.segmentRegistration.findUnique;
            (prisma.segmentRegistration as any).findUnique = async () => ({
                id: 88,
                segmentId: 1,
                userId: 10,
            });

            try {
                await assert.rejects(
                    async () => {
                        await SegmentRegistrationService.registerForSegment(10, { segmentId: 1 });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.CONFLICT);
                        assert.match(err.message, /already registered/i);
                        return true;
                    }
                );
            } finally {
                (prisma.segment as any).findUnique = originalSegmentFind;
                (prisma.segmentRegistration as any).findUnique = originalRegFind;
            }
        });

        it("should assign FREE status when segment fee is 0, and decrement seatsLeft", async () => {
            const originalSegmentFind = prisma.segment.findUnique;
            (prisma.segment as any).findUnique = async () => ({
                id: 2,
                seatsLeft: 10,
                registrationFee: 0,
            });

            const originalRegFind = prisma.segmentRegistration.findUnique;
            (prisma.segmentRegistration as any).findUnique = async () => null;

            let createdData: any = null;
            let updatedSeatData: any = null;

            const originalTx = prisma.$transaction;
            (prisma as any).$transaction = async (cb: any) => {
                const fakeTx = {
                    segmentRegistration: {
                        create: async (args: any) => {
                            createdData = args.data;
                            return { id: 1, ...args.data };
                        },
                    },
                    segment: {
                        update: async (args: any) => {
                            updatedSeatData = args.data;
                            return {};
                        },
                        updateMany: async (args: any) => {
                            updatedSeatData = args.data;
                            return { count: 1 };
                        },
                    },
                };
                return cb(fakeTx);
            };

            try {
                const result = await SegmentRegistrationService.registerForSegment(10, { segmentId: 2 });
                assert.ok(result);
                assert.equal(createdData.paymentStatus, SegmentPaymentStatus.FREE);
                assert.deepEqual(updatedSeatData, { seatsLeft: { decrement: 1 } });
            } finally {
                (prisma.segment as any).findUnique = originalSegmentFind;
                (prisma.segmentRegistration as any).findUnique = originalRegFind;
                (prisma as any).$transaction = originalTx;
            }
        });

        it("should reject registration atomically inside transaction if another concurrent request took the last seat", async () => {
            const originalSegmentFind = prisma.segment.findUnique;
            (prisma.segment as any).findUnique = async () => ({
                id: 3,
                seatsLeft: 1, // initially appears available
                registrationFee: 0,
            });

            const originalRegFind = prisma.segmentRegistration.findUnique;
            (prisma.segmentRegistration as any).findUnique = async () => null;

            const originalTx = prisma.$transaction;
            (prisma as any).$transaction = async (cb: any) => {
                const fakeTx = {
                    segmentRegistration: {
                        create: async () => ({ id: 1 }),
                    },
                    segment: {
                        updateMany: async () => ({ count: 0 }), // 0 rows updated because another worker took the seat!
                    },
                };
                return cb(fakeTx);
            };

            try {
                await assert.rejects(
                    async () => {
                        await SegmentRegistrationService.registerForSegment(10, { segmentId: 3 });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /No seats (available|left)/i);
                        return true;
                    }
                );
            } finally {
                (prisma.segment as any).findUnique = originalSegmentFind;
                (prisma.segmentRegistration as any).findUnique = originalRegFind;
                (prisma as any).$transaction = originalTx;
            }
        });

        it("should forbid student from cancelling another student's registration", async () => {
            const originalFindUnique = prisma.segmentRegistration.findUnique;
            // Registration belongs to user 99
            (prisma.segmentRegistration as any).findUnique = async () => ({
                id: 50,
                userId: 99,
                segmentId: 1,
            });

            try {
                // User 6 (studentSection1) attempts to cancel user 99's registration
                await assert.rejects(
                    async () => {
                        await SegmentRegistrationService.cancelRegistration(50, mockUsers.studentSection1);
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.FORBIDDEN);
                        assert.match(err.message, /permission to cancel/i);
                        return true;
                    }
                );
            } finally {
                (prisma.segmentRegistration as any).findUnique = originalFindUnique;
            }
        });
    });

    describe("Committee & Accounting Rules", () => {
        it("should reject adding duplicate committee member with 409 Conflict", async () => {
            const originalCommFind = prisma.committee.findUnique;
            (prisma.committee as any).findUnique = async () => ({ id: 1, name: "Food" });

            const originalUserFind = prisma.user.findUnique;
            (prisma.user as any).findUnique = async () => ({ id: 25 });

            const originalMemberFind = prisma.committeeMember.findUnique;
            (prisma.committeeMember as any).findUnique = async () => ({
                id: 1,
                committeeId: 1,
                userId: 25,
            });

            try {
                await assert.rejects(
                    async () => {
                        await CommitteeService.addMember(1, { userId: 25 });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.CONFLICT);
                        assert.match(err.message, /already a member/i);
                        return true;
                    }
                );
            } finally {
                (prisma.committee as any).findUnique = originalCommFind;
                (prisma.user as any).findUnique = originalUserFind;
                (prisma.committeeMember as any).findUnique = originalMemberFind;
            }
        });

        it("should reject expense creation if committee does not exist (404 Not Found)", async () => {
            const originalCommFind = prisma.committee.findUnique;
            (prisma.committee as any).findUnique = async () => null;

            try {
                await assert.rejects(
                    async () => {
                        await ExpenseService.createExpense(1, {
                            committeeId: 9999,
                            itemTitle: "Non-existent",
                            amount: 500,
                        });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.NOT_FOUND);
                        assert.match(err.message, /Committee not found/i);
                        return true;
                    }
                );
            } finally {
                (prisma.committee as any).findUnique = originalCommFind;
            }
        });
    });

    describe("Production Financial & Security Hardenings", () => {
        it("should prevent marking student UNPAID if remaining collected fees would be less than submitted handovers", async () => {
            const originalUserFind = prisma.user.findUnique;
            (prisma.user as any).findUnique = async () => ({
                id: 10,
                sectionId: 1,
                festFeeStatus: FestFeeStatus.PAID_TO_CR,
                paidAmount: 1000,
                kitDelivered: false,
                section: { festFee: 1000 },
            });

            const originalUserAgg = prisma.user.aggregate;
            (prisma.user as any).aggregate = async () => ({
                _sum: { paidAmount: 4000 }, // other users collected = 4000
            });

            const originalHandoverAgg = prisma.cashHandover.aggregate;
            (prisma.cashHandover as any).aggregate = async () => ({
                _sum: { amount: 5000 }, // total handed over = 5000 (exceeds 4000)
            });

            try {
                await assert.rejects(
                    async () => {
                        await UserService.updateFeeStatus(10, { festFeeStatus: "UNPAID" });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /already been submitted in a CR handover/i);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findUnique = originalUserFind;
                (prisma.user as any).aggregate = originalUserAgg;
                (prisma.cashHandover as any).aggregate = originalHandoverAgg;
            }
        });

        it("should prevent double verification of an already VERIFIED cash handover", async () => {
            const originalHandoverFind = prisma.cashHandover.findUnique;
            (prisma.cashHandover as any).findUnique = async () => ({
                id: 12,
                status: HandoverStatus.VERIFIED,
                amount: 3000,
            });

            try {
                await assert.rejects(
                    async () => {
                        await CashHandoverService.verifyHandover(12);
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /already verified/i);
                        return true;
                    }
                );
            } finally {
                (prisma.cashHandover as any).findUnique = originalHandoverFind;
            }
        });
    });

    describe("Student Self-Service Profile Editing (updateMyProfile)", () => {
        it("should reject email change if email is already taken by another student (409 Conflict)", async () => {
            const originalFindUnique = prisma.user.findUnique;
            (prisma.user as any).findUnique = async (args: any) => {
                if (args.where.id === 5) {
                    return { id: 5, email: "old@fest.cse", sectionId: 1, festFeeStatus: FestFeeStatus.UNPAID, role: Role.STUDENT };
                }
                if (args.where.email === "taken@fest.cse") {
                    return { id: 99, email: "taken@fest.cse" };
                }
                return null;
            };

            try {
                await assert.rejects(
                    async () => {
                        await UserService.updateMyProfile(5, { email: "taken@fest.cse" });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.CONFLICT);
                        assert.match(err.message, /already in use by another student/i);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findUnique = originalFindUnique;
            }
        });

        it("should reject section switch when student is already PAID_TO_CR (400 Bad Request)", async () => {
            const originalFindUnique = prisma.user.findUnique;
            const originalSectionFind = prisma.section.findUnique;

            (prisma.user as any).findUnique = async (args: any) => ({
                id: 5,
                email: "student@fest.cse",
                sectionId: 1,
                festFeeStatus: FestFeeStatus.PAID_TO_CR,
                role: Role.STUDENT,
            });
            (prisma.section as any).findUnique = async () => ({ id: 2, code: "1B" });

            try {
                await assert.rejects(
                    async () => {
                        await UserService.updateMyProfile(5, { sectionId: 2 });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /Cannot switch academic section after your fest fee has already been marked PAID_TO_CR/i);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findUnique = originalFindUnique;
                (prisma.section as any).findUnique = originalSectionFind;
            }
        });

        it("should reject section switch when user is CR (400 Bad Request)", async () => {
            const originalFindUnique = prisma.user.findUnique;
            const originalSectionFind = prisma.section.findUnique;

            (prisma.user as any).findUnique = async (args: any) => ({
                id: 8,
                email: "cr@fest.cse",
                sectionId: 1,
                festFeeStatus: FestFeeStatus.UNPAID,
                role: Role.CR,
            });
            (prisma.section as any).findUnique = async () => ({ id: 2, code: "1B" });

            try {
                await assert.rejects(
                    async () => {
                        await UserService.updateMyProfile(8, { sectionId: 2 });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /Class Representatives cannot switch sections while assigned as CR/i);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findUnique = originalFindUnique;
                (prisma.section as any).findUnique = originalSectionFind;
            }
        });

        it("should successfully update profile and hash new password when provided", async () => {
            const originalFindUnique = prisma.user.findUnique;
            const originalSectionFind = prisma.section.findUnique;
            const originalUpdate = prisma.user.update;

            let capturedUpdateData: any = null;

            (prisma.user as any).findUnique = async (args: any) => {
                if (args.where.id === 15) {
                    return {
                        id: 15,
                        email: "rahim@fest.cse",
                        phone: "01711111111",
                        tshirtSize: "M",
                        sectionId: 1,
                        festFeeStatus: FestFeeStatus.UNPAID,
                        role: Role.STUDENT,
                        password: "oldHashedPassword",
                    };
                }
                return null; // email not taken
            };

            (prisma.section as any).findUnique = async () => ({ id: 2, code: "1B" });

            (prisma.user as any).update = async (args: any) => {
                capturedUpdateData = args.data;
                return {
                    id: 15,
                    name: "Rahim",
                    email: args.data.email || "rahim@fest.cse",
                    phone: args.data.phone || "01711111111",
                    tshirtSize: args.data.tshirtSize || "XL",
                    sectionId: 2,
                    festFeeStatus: FestFeeStatus.UNPAID,
                    role: Role.STUDENT,
                    password: args.data.password,
                    section: { id: 2, code: "1B" },
                };
            };

            try {
                const res = await UserService.updateMyProfile(15, {
                    tshirtSize: "XL",
                    sectionId: 2,
                    newPassword: "BrandNewPassword123!",
                });

                assert.ok(res);
                assert.equal((res as any).password, undefined); // password stripped
                assert.equal(res.tshirtSize, "XL");
                assert.ok(capturedUpdateData.password);
                assert.notEqual(capturedUpdateData.password, "BrandNewPassword123!"); // must be hashed!
            } finally {
                (prisma.user as any).findUnique = originalFindUnique;
                (prisma.section as any).findUnique = originalSectionFind;
                (prisma.user as any).update = originalUpdate;
            }
        });
    });

    describe("Brevo Email Forgot Password Recovery (AuthService.forgotPassword)", () => {
        it("should reject forgot password for non-existent student ID or email with 404", async () => {
            const originalFind = prisma.user.findFirst;
            (prisma.user as any).findFirst = async () => null;

            try {
                await assert.rejects(
                    async () => {
                        await AuthService.forgotPassword({ identifier: "nonexistent@fest.cse" });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.NOT_FOUND);
                        assert.match(err.message, /No registered student found/i);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findFirst = originalFind;
            }
        });

        it("should enforce 60-second cooldown with 429 Too Many Requests", async () => {
            const originalFind = prisma.user.findFirst;
            // Password reset requested 20 seconds ago
            (prisma.user as any).findFirst = async () => ({
                id: 1,
                email: "student@fest.cse",
                name: "Student One",
                studentId: "11230121001",
                passwordResetLastSentAt: new Date(Date.now() - 20000),
            });

            try {
                await assert.rejects(
                    async () => {
                        await AuthService.forgotPassword({ identifier: "11230121001" });
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.TOO_MANY_REQUESTS);
                        assert.match(err.message, /wait 60 seconds/i);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findFirst = originalFind;
            }
        });

        it("should generate new password, update user hash, and return maskedEmail when cooldown has passed", async () => {
            const originalFind = prisma.user.findFirst;
            const originalUpdate = prisma.user.update;

            let capturedUpdateData: any = null;

            // Password reset requested 90 seconds ago (cooldown expired)
            (prisma.user as any).findFirst = async () => ({
                id: 2,
                email: "yeasir@csefest.com",
                name: "Yeasir",
                studentId: "11230121177",
                passwordResetLastSentAt: new Date(Date.now() - 90000),
            });

            (prisma.user as any).update = async (args: any) => {
                capturedUpdateData = args.data;
                return { id: 2 };
            };

            try {
                const res = await AuthService.forgotPassword({ identifier: "yeasir@csefest.com" });
                assert.ok(res);
                assert.equal(res.maskedEmail, "ye***@csefest.com");
                assert.ok(capturedUpdateData.password);
                assert.ok(capturedUpdateData.passwordResetLastSentAt);
            } finally {
                (prisma.user as any).findFirst = originalFind;
                (prisma.user as any).update = originalUpdate;
            }
        });
    });

    describe("The 6 Critical Financial & State-Transition Edge Case Guards", () => {
        it("Guard 1: updateSemesterFee should update sections only without altering paidAmount of already-paid students", async () => {
            const originalUpdateMany = prisma.section.updateMany;
            let capturedSectionUpdate: any = null;

            (prisma.section as any).updateMany = async (args: any) => {
                capturedSectionUpdate = args;
                return { count: 4 };
            };

            try {
                const res = await SectionService.updateSemesterFee({ semester: 8, festFee: 2000 });
                assert.equal(res.semester, 8);
                assert.equal(res.festFee, 2000);
                assert.equal(res.updatedSectionsCount, 4);
                assert.equal((res as any).updatedPaidUsersCount, undefined); // user paidAmount was NOT touched
                assert.deepEqual(capturedSectionUpdate.where, { semester: 8 });
                assert.deepEqual(capturedSectionUpdate.data, { festFee: 2000 });
            } finally {
                (prisma.section as any).updateMany = originalUpdateMany;
            }
        });

        it("Guard 3: should prevent demoting the sole CR whose section still holds unhanded cash (400 Bad Request)", async () => {
            const originalUserFind = prisma.user.findUnique;
            const originalUserAgg = prisma.user.aggregate;
            const originalHandoverAgg = prisma.cashHandover.aggregate;
            const originalUserCount = prisma.user.count;

            (prisma.user as any).findUnique = async () => ({
                id: 20,
                role: Role.CR,
                sectionId: 5,
            });

            (prisma.user as any).aggregate = async () => ({
                _sum: { paidAmount: 15000 }, // 15,000 collected
            });

            (prisma.cashHandover as any).aggregate = async () => ({
                _sum: { amount: 5000 }, // only 5,000 handed over -> 10,000 remaining unhanded!
            });

            (prisma.user as any).count = async () => 0; // no other CR in section 5

            try {
                await assert.rejects(
                    async () => {
                        await UserService.updateUserRole(20, Role.STUDENT);
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /Cannot demote CR while their section still holds unhanded collected cash/i);
                        return true;
                    }
                );
            } finally {
                (prisma.user as any).findUnique = originalUserFind;
                (prisma.user as any).aggregate = originalUserAgg;
                (prisma.cashHandover as any).aggregate = originalHandoverAgg;
                (prisma.user as any).count = originalUserCount;
            }
        });

        it("Guard 4: deleteSection should reject deleting a section with registered students or handovers (400 Bad Request)", async () => {
            const originalSectionFind = prisma.section.findUnique;
            const originalUserCount = prisma.user.count;
            const originalHandoverCount = prisma.cashHandover.count;

            (prisma.section as any).findUnique = async () => ({ id: 1, code: "1A" });
            (prisma.user as any).count = async () => 15; // 15 students in this section
            (prisma.cashHandover as any).count = async () => 0;

            try {
                await assert.rejects(
                    async () => {
                        await SectionService.deleteSection(1);
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /Cannot delete a section that has registered students/i);
                        return true;
                    }
                );
            } finally {
                (prisma.section as any).findUnique = originalSectionFind;
                (prisma.user as any).count = originalUserCount;
                (prisma.cashHandover as any).count = originalHandoverCount;
            }
        });

        it("Guard 4: deleteCommittee should reject deleting a committee with logged expenses or members (400 Bad Request)", async () => {
            const originalCommFind = prisma.committee.findUnique;
            const originalExpenseCount = prisma.expense.count;
            const originalMemberCount = prisma.committeeMember.count;

            (prisma.committee as any).findUnique = async () => ({ id: 2, name: "Logistics" });
            (prisma.expense as any).count = async () => 2; // has logged expenses
            (prisma.committeeMember as any).count = async () => 0;

            try {
                await assert.rejects(
                    async () => {
                        await CommitteeService.deleteCommittee(2);
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /Cannot delete a committee that has logged expenses/i);
                        return true;
                    }
                );
            } finally {
                (prisma.committee as any).findUnique = originalCommFind;
                (prisma.expense as any).count = originalExpenseCount;
                (prisma.committeeMember as any).count = originalMemberCount;
            }
        });

        it("Guard 4: deleteSegment should reject deleting a contest with registered participants (400 Bad Request)", async () => {
            const originalSegmentFind = prisma.segment.findUnique;

            (prisma.segment as any).findUnique = async () => ({
                id: 10,
                title: "Code Jam",
                _count: { registrations: 3 }, // has 3 participants
            });

            try {
                await assert.rejects(
                    async () => {
                        await SegmentService.deleteSegment(10);
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /Cannot delete a contest that already has registered participants/i);
                        return true;
                    }
                );
            } finally {
                (prisma.segment as any).findUnique = originalSegmentFind;
            }
        });

        it("Guard 5: updateSegment should reject shrinking maxCapacity lower than current registered count (400 Bad Request)", async () => {
            const originalSegmentFind = prisma.segment.findUnique;

            (prisma.segment as any).findUnique = async () => ({
                id: 10,
                title: "Robotics",
                maxCapacity: 50,
                seatsLeft: 30,
                _count: { registrations: 20 }, // 20 users already registered
            });

            try {
                await assert.rejects(
                    async () => {
                        await SegmentService.updateSegment(10, { maxCapacity: 15 }); // 15 < 20!
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /Cannot set maxCapacity lower than current registered participant count/i);
                        return true;
                    }
                );
            } finally {
                (prisma.segment as any).findUnique = originalSegmentFind;
            }
        });

        it("Guard 6: cancelRegistration should block student from self-cancelling a PAID contest registration (400 Bad Request)", async () => {
            const originalRegFind = prisma.segmentRegistration.findUnique;

            (prisma.segmentRegistration as any).findUnique = async () => ({
                id: 101,
                userId: mockUsers.studentSection1.userId,
                paymentStatus: SegmentPaymentStatus.PAID,
                segmentId: 1,
            });

            try {
                await assert.rejects(
                    async () => {
                        await SegmentRegistrationService.cancelRegistration(101, mockUsers.studentSection1);
                    },
                    (err: any) => {
                        assert.ok(err instanceof AppError);
                        assert.equal(err.statusCode, status.BAD_REQUEST);
                        assert.match(err.message, /Cannot cancel a contest registration after entry fee has been marked PAID/i);
                        return true;
                    }
                );
            } finally {
                (prisma.segmentRegistration as any).findUnique = originalRegFind;
            }
        });
    });
});
