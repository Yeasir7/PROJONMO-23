import status from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";

const createCommittee = async (data: {
    name: string;
    description?: string;
    allocatedBudget?: number;
}) => {
    const existing = await prisma.committee.findUnique({
        where: { name: data.name },
    });
    if (existing) {
        throw new AppError(status.CONFLICT, "Committee with this name already exists");
    }

    const committee = await prisma.committee.create({ data });
    return committee;
};

const getAllCommittees = async () => {
    const committees = await prisma.committee.findMany({
        include: {
            expenses: { select: { amount: true } },
            _count: { select: { members: true, expenses: true } },
        },
        orderBy: { name: "asc" },
    });

    return committees.map((committee) => {
        const totalSpent = committee.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const remainingBudget = committee.allocatedBudget - totalSpent;
        return {
            ...committee,
            totalSpent,
            remainingBudget,
        };
    });
};

const getCommitteeById = async (id: number) => {
    const committee = await prisma.committee.findUnique({
        where: { id },
        include: {
            members: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, studentId: true, phone: true },
                    },
                },
            },
            expenses: {
                include: {
                    spentBy: { select: { id: true, name: true } },
                },
            },
            _count: { select: { members: true, expenses: true } },
        },
    });

    if (!committee) {
        throw new AppError(status.NOT_FOUND, "Committee not found");
    }

    return committee;
};

const updateCommittee = async (
    id: number,
    data: { name?: string; description?: string; allocatedBudget?: number }
) => {
    const existing = await prisma.committee.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Committee not found");
    }

    const committee = await prisma.committee.update({
        where: { id },
        data,
    });
    return committee;
};

const deleteCommittee = async (id: number) => {
    const existing = await prisma.committee.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Committee not found");
    }

    const [expenseCount, memberCount] = await Promise.all([
        prisma.expense.count({ where: { committeeId: id } }),
        prisma.committeeMember.count({ where: { committeeId: id } }),
    ]);

    if (expenseCount > 0 || memberCount > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot delete a committee that has logged expenses or assigned members"
        );
    }

    const committee = await prisma.committee.delete({
        where: { id },
    });
    return committee;
};

const addMember = async (
    committeeId: number,
    data: { userId: number; designation?: string }
) => {
    const committee = await prisma.committee.findUnique({ where: { id: committeeId } });
    if (!committee) {
        throw new AppError(status.NOT_FOUND, "Committee not found");
    }

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const existingMember = await prisma.committeeMember.findUnique({
        where: { committeeId_userId: { committeeId, userId: data.userId } },
    });
    if (existingMember) {
        throw new AppError(status.CONFLICT, "User is already a member of this committee");
    }

    const member = await prisma.committeeMember.create({
        data: {
            committeeId,
            userId: data.userId,
            designation: data.designation ?? "MEMBER",
        },
        include: {
            user: { select: { id: true, name: true, email: true, studentId: true } },
        },
    });
    return member;
};

const updateMemberDesignation = async (
    committeeId: number,
    userId: number,
    designation: string
) => {
    const existing = await prisma.committeeMember.findUnique({
        where: {
            committeeId_userId: { committeeId, userId },
        },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Committee member not found");
    }

    const member = await prisma.committeeMember.update({
        where: {
            committeeId_userId: { committeeId, userId },
        },
        data: {
            designation,
        },
        include: {
            user: { select: { id: true, name: true, email: true, studentId: true } },
        },
    });
    return member;
};

const removeMember = async (committeeId: number, userId: number) => {
    const existing = await prisma.committeeMember.findUnique({
        where: {
            committeeId_userId: { committeeId, userId },
        },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Committee member not found");
    }

    const member = await prisma.committeeMember.delete({
        where: {
            committeeId_userId: { committeeId, userId },
        },
    });
    return member;
};

export const CommitteeService = {
    createCommittee,
    getAllCommittees,
    getCommitteeById,
    updateCommittee,
    deleteCommittee,
    addMember,
    updateMemberDesignation,
    removeMember,
};
