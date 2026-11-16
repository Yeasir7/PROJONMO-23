import status from "http-status";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errorHelpers/AppError.js";
import { calculatePagination } from "../../shared/pagination.js";

const createExpense = async (
    spentById: number,
    data: { committeeId: number; itemTitle: string; amount: number; voucherNote?: string }
) => {
    const committee = await prisma.committee.findUnique({
        where: { id: data.committeeId },
    });
    if (!committee) {
        throw new AppError(status.NOT_FOUND, "Committee not found");
    }

    const spentAggregate = await prisma.expense.aggregate({
        where: { committeeId: data.committeeId },
        _sum: { amount: true },
    });
    const existingSpent = spentAggregate._sum.amount ?? 0;

    if (existingSpent + data.amount > committee.allocatedBudget) {
        throw new AppError(
            status.BAD_REQUEST,
            "Expense exceeds the committee's remaining allocated budget"
        );
    }

    const expense = await prisma.expense.create({
        data: {
            spentById,
            committeeId: data.committeeId,
            itemTitle: data.itemTitle,
            amount: data.amount,
            voucherNote: data.voucherNote,
        },
        include: {
            committee: { select: { id: true, name: true } },
            spentBy: { select: { id: true, name: true } },
        },
    });

    return expense;
};

const getAllExpenses = async (query?: { committeeId?: string; page?: string; limit?: string }) => {
    const where: Record<string, unknown> = {};

    if (query?.committeeId) {
        where.committeeId = Number(query.committeeId);
    }

    const { page, limit, skip } = calculatePagination(
        {
            ...query,
            limit: query?.limit ? Number(query.limit) : 2000,
        },
        "createdAt",
        2000,
        2000
    );

    const [total, expenses] = await Promise.all([
        prisma.expense.count({ where }).catch(() => 0),
        prisma.expense.findMany({
            where,
            include: {
                committee: { select: { id: true, name: true } },
                spentBy: { select: { id: true, name: true } },
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
        data: expenses,
    };
};

const getExpenseById = async (id: number) => {
    const expense = await prisma.expense.findUnique({
        where: { id },
        include: {
            committee: { select: { id: true, name: true } },
            spentBy: { select: { id: true, name: true } },
        },
    });

    if (!expense) {
        throw new AppError(status.NOT_FOUND, "Expense not found");
    }

    return expense;
};

const deleteExpense = async (id: number) => {
    const existing = await prisma.expense.findUnique({ where: { id } });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Expense not found");
    }

    await prisma.expense.delete({ where: { id } });

    return existing;
};

export const ExpenseService = {
    createExpense,
    getAllExpenses,
    getExpenseById,
    deleteExpense,
};
