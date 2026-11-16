import bcrypt from "bcrypt";
import { FestFeeStatus, HandoverStatus, Prisma, Role } from "@prisma/client";
import status from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { calculatePagination } from "../../shared/pagination.js";

const sanitizeUser = (user: any) => {
    const { password: _, passwordResetLastSentAt: __, ...userWithoutPassword } = user;
    return {
        ...userWithoutPassword,
        committeeMemberships: user.committeeMembers || [],
    };
};

const getMe = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            section: true,
            committeeMembers: {
                include: {
                    committee: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
    });
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }
    return sanitizeUser(user);
};

const getAllUsers = async (
    requestingUser: { role: string; sectionId: number | null },
    query: { sectionId?: string; role?: string; festFeeStatus?: string; page?: string; limit?: string },
) => {
    const where: Prisma.UserWhereInput = {};

    if (query.sectionId) {
        where.sectionId = Number(query.sectionId);
    }
    if (query.role) {
        where.role = query.role as Role;
    }
    if (query.festFeeStatus) {
        where.festFeeStatus = query.festFeeStatus as any;
    }

    // SECURITY: CRs and Students can only see users in their own section
    if (requestingUser.role === Role.CR || requestingUser.role === Role.STUDENT) {
        where.sectionId = requestingUser.sectionId;
    }

    const { page, limit, skip } = calculatePagination(
        {
            ...query,
            limit: query.limit ? Number(query.limit) : 2000,
        },
        "createdAt",
        2000,
        2000
    );

    const [total, users] = await Promise.all([
        prisma.user.count({ where }).catch(() => 0),
        prisma.user.findMany({
            where,
            include: {
                section: true,
                committeeMembers: {
                    include: {
                        committee: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: users.map(sanitizeUser),
    };
};

const getUserById = async (
    id: number,
    requestingUser?: { role: string; sectionId: number | null },
) => {
    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            section: true,
            committeeMembers: {
                include: {
                    committee: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
    });
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }
    if ((requestingUser?.role === Role.CR || requestingUser?.role === Role.STUDENT) && user.sectionId !== requestingUser.sectionId) {
        throw new AppError(status.FORBIDDEN, "You do not have permission to view this user");
    }
    return sanitizeUser(user);
};

const updateUserRole = async (
    targetUserId: number,
    newRole: string,
    currentUser?: { userId: number; role: string }
) => {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (currentUser && targetUserId === currentUser.userId) {
        throw new AppError(status.BAD_REQUEST, "You cannot modify your own role");
    }

    if (currentUser?.role === Role.CONVENOR) {
        const isCurrentAllowed = targetUser.role === Role.STUDENT || targetUser.role === Role.CR;
        const isNewAllowed = newRole === Role.STUDENT || newRole === Role.CR;
        if (!isCurrentAllowed || !isNewAllowed) {
            throw new AppError(
                status.FORBIDDEN,
                "Convenors can only promote or demote Class Representatives (STUDENT <-> CR)"
            );
        }
    } else if (currentUser?.role === Role.SUPER_ADMIN) {
        if (newRole === Role.SUPER_ADMIN) {
            throw new AppError(
                status.FORBIDDEN,
                "Super Admin cannot assign Super Admin role"
            );
        }
    }

    // Guard 3: Prevent Demoting a CR Whose Section Still Holds Unhanded Cash
    if (targetUser.role === Role.CR && newRole !== Role.CR && targetUser.sectionId) {
        const [collectedAgg, handoverAgg, otherCrCount] = await Promise.all([
            prisma.user.aggregate({
                where: {
                    sectionId: targetUser.sectionId,
                    festFeeStatus: FestFeeStatus.PAID_TO_CR,
                },
                _sum: { paidAmount: true },
            }),
            prisma.cashHandover.aggregate({
                where: {
                    sectionId: targetUser.sectionId,
                    status: { in: [HandoverStatus.PENDING, HandoverStatus.VERIFIED] },
                },
                _sum: { amount: true },
            }),
            prisma.user.count({
                where: {
                    sectionId: targetUser.sectionId,
                    role: Role.CR,
                    id: { not: targetUser.id },
                },
            }),
        ]);

        const totalSectionCollected = collectedAgg._sum.paidAmount ?? 0;
        const totalSectionHandedOver = handoverAgg._sum.amount ?? 0;

        if (otherCrCount === 0 && totalSectionCollected > totalSectionHandedOver) {
            throw new AppError(
                status.BAD_REQUEST,
                "Cannot demote CR while their section still holds unhanded collected cash. Hand over remaining cash or assign another CR first."
            );
        }
    }

    const user = await prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole as Role },
    });
    const { password: _, passwordResetLastSentAt: __, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

const updateFeeStatus = async (
    id: number,
    data: { festFeeStatus: string; paidAmount?: number },
    requestingUser?: { role: string; sectionId: number | null },
) => {
    const existing = await prisma.user.findUnique({
        where: { id },
        include: { section: true },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }
    if (requestingUser?.role === Role.CR && existing.sectionId !== requestingUser.sectionId) {
        throw new AppError(status.FORBIDDEN, "You can only update fee status for students in your section");
    }

    if (data.festFeeStatus === "PAID_TO_CR") {
        const currentSectionFee = existing.section?.festFee ?? 0;
        if (currentSectionFee <= 0) {
            throw new AppError(status.BAD_REQUEST, "Fest fee for this semester has not been set by the Convenor yet.");
        }
    }

    if (existing.festFeeStatus === FestFeeStatus.PAID_TO_CR && data.festFeeStatus === "UNPAID" && existing.sectionId) {
        const sectionUsers = await prisma.user.aggregate({
            where: {
                sectionId: existing.sectionId,
                festFeeStatus: FestFeeStatus.PAID_TO_CR,
                id: { not: existing.id },
            },
            _sum: { paidAmount: true },
        });
        const totalSectionCollectedAfter = sectionUsers._sum.paidAmount ?? 0;

        const handoverAgg = await prisma.cashHandover.aggregate({
            where: {
                sectionId: existing.sectionId,
                status: { in: [HandoverStatus.PENDING, HandoverStatus.VERIFIED] },
            },
            _sum: { amount: true },
        });
        const totalHandedOver = handoverAgg._sum.amount ?? 0;

        if (totalSectionCollectedAfter < totalHandedOver) {
            throw new AppError(
                status.BAD_REQUEST,
                "Cannot mark student UNPAID because this cash has already been submitted in a CR handover."
            );
        }
    }

    let paidAmount = data.paidAmount;
    let kitDelivered = existing.kitDelivered;
    if (data.festFeeStatus === "PAID_TO_CR" && data.paidAmount === undefined) {
        paidAmount = existing.section?.festFee ?? 0;
    } else if (data.festFeeStatus === "UNPAID") {
        paidAmount = 0;
        kitDelivered = false;
    }

    const user = await prisma.user.update({
        where: { id },
        data: {
            festFeeStatus: data.festFeeStatus as any,
            kitDelivered,
            ...(paidAmount !== undefined && { paidAmount }),
        },
    });
    const { password: _, passwordResetLastSentAt: __, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

const whitelistStudent = async (payload: { studentId: string; fullName: string }) => {
    const student = await prisma.allowedStudent.upsert({
        where: { studentId: payload.studentId },
        update: { fullName: payload.fullName },
        create: {
            studentId: payload.studentId,
            fullName: payload.fullName,
            isClaimed: false,
        },
    });
    return student;
};

const updateKitStatus = async (id: number, kitDelivered: boolean) => {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (kitDelivered && existing.festFeeStatus !== FestFeeStatus.PAID_TO_CR) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot deliver Fest Kit to an unpaid student. Fee must be PAID_TO_CR first."
        );
    }

    const user = await prisma.user.update({
        where: { id },
        data: { kitDelivered },
    });
    const { password: _, passwordResetLastSentAt: __, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

interface IUpdateMyProfilePayload {
    email?: string;
    phone?: string;
    tshirtSize?: "S" | "M" | "L" | "XL" | "XXL";
    sectionId?: number;
    newPassword?: string;
}

const updateMyProfile = async (userId: number, payload: IUpdateMyProfilePayload) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (payload.email && payload.email.trim().toLowerCase() !== user.email.toLowerCase()) {
        const trimmedEmail = payload.email.trim();
        const existingEmailUser = await prisma.user.findUnique({
            where: { email: trimmedEmail },
        });
        if (existingEmailUser) {
            throw new AppError(
                status.CONFLICT,
                "This email address is already in use by another student"
            );
        }
        updateData.email = trimmedEmail;
    }

    if (payload.phone !== undefined) {
        updateData.phone = payload.phone.trim();
    }

    if (payload.tshirtSize !== undefined) {
        updateData.tshirtSize = payload.tshirtSize as any;
    }

    if (payload.sectionId !== undefined && payload.sectionId !== user.sectionId) {
        const targetSection = await prisma.section.findUnique({
            where: { id: payload.sectionId },
        });
        if (!targetSection) {
            throw new AppError(status.NOT_FOUND, "Target section not found");
        }

        if (user.festFeeStatus === FestFeeStatus.PAID_TO_CR) {
            throw new AppError(
                status.BAD_REQUEST,
                "Cannot switch academic section after your fest fee has already been marked PAID_TO_CR"
            );
        }

        if (user.role === Role.CR) {
            throw new AppError(
                status.BAD_REQUEST,
                "Class Representatives cannot switch sections while assigned as CR"
            );
        }

        updateData.section = { connect: { id: payload.sectionId } };
    }

    if (payload.newPassword) {
        const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
        updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: { section: true },
    });

    const { password: _, passwordResetLastSentAt: __, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
};

export const UserService = {
    getMe,
    getAllUsers,
    getUserById,
    updateUserRole,
    updateFeeStatus,
    whitelistStudent,
    updateKitStatus,
    updateMyProfile,
};
