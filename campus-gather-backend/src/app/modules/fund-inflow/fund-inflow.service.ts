import status from "http-status";
import { InflowCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errorHelpers/AppError.js";
import { calculatePagination } from "../../shared/pagination.js";

const createInflow = async (
    receivedById: number,
    data: { sourceTitle: string; category?: InflowCategory; amount: number; notes?: string }
) => {
    const inflow = await prisma.fundInflow.create({
        data: {
            receivedById,
            sourceTitle: data.sourceTitle,
            category: data.category,
            amount: data.amount,
            notes: data.notes,
        },
        include: {
            receivedBy: { select: { id: true, name: true } },
        },
    });

    return inflow;
};

const getAllInflows = async (query?: { category?: string; page?: string; limit?: string }) => {
    const where: Record<string, unknown> = {};

    if (query?.category) {
        where.category = query.category as InflowCategory;
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

    const [total, inflows] = await Promise.all([
        prisma.fundInflow.count({ where }).catch(() => 0),
        prisma.fundInflow.findMany({
            where,
            include: {
                receivedBy: { select: { id: true, name: true } },
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
        data: inflows,
    };
};

const getInflowById = async (id: number) => {
    const inflow = await prisma.fundInflow.findUnique({
        where: { id },
        include: {
            receivedBy: { select: { id: true, name: true } },
        },
    });

    if (!inflow) {
        throw new AppError(status.NOT_FOUND, "Fund inflow not found");
    }

    return inflow;
};

const deleteInflow = async (id: number) => {
    const existing = await prisma.fundInflow.findUnique({ where: { id } });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Fund inflow not found");
    }

    await prisma.fundInflow.delete({ where: { id } });

    return existing;
};

export const FundInflowService = {
    createInflow,
    getAllInflows,
    getInflowById,
    deleteInflow,
};
