import status from "http-status";
import { HandoverStatus, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errorHelpers/AppError.js";
import { calculatePagination } from "../../shared/pagination.js";

const createHandover = async (
    user: { userId: number; sectionId: number | null },
    data: { sectionId?: number; receivedById: number; amount: number; notes?: string }
) => {
    const sectionId = data.sectionId ?? user.sectionId;
    if (!sectionId) {
        throw new AppError(status.BAD_REQUEST, "Section ID is required");
    }

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
        throw new AppError(status.NOT_FOUND, "Section not found");
    }

    const receiver = await prisma.user.findUnique({ where: { id: data.receivedById } });
    if (!receiver) {
        throw new AppError(status.NOT_FOUND, "Receiving user not found");
    }

    const [userAggregate, handoverAggregate] = await Promise.all([
        prisma.user.aggregate({
            where: { sectionId },
            _sum: { paidAmount: true },
        }),
        prisma.cashHandover.aggregate({
            where: { sectionId },
            _sum: { amount: true },
        }),
    ]);

    const totalCollected = userAggregate._sum.paidAmount ?? 0;
    const totalHandedOver = handoverAggregate._sum.amount ?? 0;

    if (totalHandedOver + data.amount > totalCollected) {
        throw new AppError(
            status.BAD_REQUEST,
            "Handover amount exceeds total collected fees in this section"
        );
    }

    const handover = await prisma.cashHandover.create({
        data: {
            crId: user.userId,
            sectionId,
            receivedById: data.receivedById,
            amount: data.amount,
            notes: data.notes,
        },
        include: {
            section: true,
            cr: { select: { id: true, name: true, studentId: true } },
            receivedBy: { select: { id: true, name: true } },
        },
    });

    return handover;
};

const getAllHandovers = async (
    requestingUser?: { role: string; sectionId: number | null },
    query?: { sectionId?: string; status?: string; page?: string; limit?: string }
) => {
    const where: Record<string, unknown> = {};

    if (query?.sectionId) {
        where.sectionId = Number(query.sectionId);
    }

    if (query?.status) {
        where.status = query.status as HandoverStatus;
    }

    // Security: CR and STUDENT can only see handovers for their own section
    if (requestingUser?.role === Role.CR || requestingUser?.role === Role.STUDENT) {
        where.sectionId = requestingUser.sectionId;
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

    const [total, handovers] = await Promise.all([
        prisma.cashHandover.count({ where }).catch(() => 0),
        prisma.cashHandover.findMany({
            where,
            include: {
                section: true,
                cr: { select: { id: true, name: true, studentId: true } },
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
        data: handovers,
    };
};

const getHandoverById = async (
    id: number,
    requestingUser?: { role: string; sectionId: number | null }
) => {
    const handover = await prisma.cashHandover.findUnique({
        where: { id },
        include: {
            section: true,
            cr: { select: { id: true, name: true, studentId: true } },
            receivedBy: { select: { id: true, name: true } },
        },
    });

    if (!handover) {
        throw new AppError(status.NOT_FOUND, "Cash handover not found");
    }

    if ((requestingUser?.role === Role.CR || requestingUser?.role === Role.STUDENT) && handover.sectionId !== requestingUser.sectionId) {
        throw new AppError(status.FORBIDDEN, "You do not have permission to view this handover");
    }

    return handover;
};

const verifyHandover = async (id: number) => {
    const existing = await prisma.cashHandover.findUnique({ where: { id } });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Cash handover not found");
    }

    if (existing.status === HandoverStatus.VERIFIED) {
        throw new AppError(status.BAD_REQUEST, "This cash handover is already verified.");
    }

    const handover = await prisma.cashHandover.update({
        where: { id },
        data: { status: HandoverStatus.VERIFIED },
        include: {
            section: true,
            cr: { select: { id: true, name: true, studentId: true } },
            receivedBy: { select: { id: true, name: true } },
        },
    });

    return handover;
};

export const CashHandoverService = {
    createHandover,
    getAllHandovers,
    getHandoverById,
    verifyHandover,
};
