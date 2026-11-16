import status from "http-status";
import { ParticipationType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errorHelpers/AppError.js";

const createSegment = async (data: {
    title: string;
    category: string;
    participationType?: ParticipationType;
    registrationFee?: number;
    maxCapacity?: number;
    description?: string;
}) => {
    const capacity = data.maxCapacity ?? 50;
    const segment = await prisma.segment.create({
        data: {
            title: data.title,
            category: data.category,
            participationType: data.participationType ?? "SOLO",
            registrationFee: data.registrationFee ?? 0,
            maxCapacity: capacity,
            seatsLeft: capacity,
            description: data.description,
        },
    });

    return segment;
};

const getAllSegments = async (query?: { category?: string }) => {
    const where: Record<string, unknown> = {};

    if (query?.category) {
        where.category = query.category;
    }

    const segments = await prisma.segment.findMany({
        where,
        include: {
            _count: {
                select: { registrations: true },
            },
        },
        orderBy: { title: "asc" },
    });

    return segments;
};

const getSegmentById = async (id: number) => {
    const segment = await prisma.segment.findUnique({
        where: { id },
        include: {
            registrations: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            studentId: true,
                            email: true,
                            section: { select: { code: true } },
                        },
                    },
                },
                orderBy: { registeredAt: "desc" },
            },
            _count: {
                select: { registrations: true },
            },
        },
    });

    if (!segment) {
        throw new AppError(status.NOT_FOUND, "Segment not found");
    }

    return segment;
};

const updateSegment = async (
    id: number,
    data: {
        title?: string;
        category?: string;
        participationType?: ParticipationType;
        registrationFee?: number;
        maxCapacity?: number;
        description?: string;
    }
) => {
    const existing = await prisma.segment.findUnique({
        where: { id },
        include: { _count: { select: { registrations: true } } },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Segment not found");
    }

    let seatsLeft = existing.seatsLeft;
    if (data.maxCapacity !== undefined) {
        const registeredCount = existing._count.registrations;
        if (data.maxCapacity < registeredCount) {
            throw new AppError(
                status.BAD_REQUEST,
                "Cannot set maxCapacity lower than current registered participant count"
            );
        }
        seatsLeft = data.maxCapacity - registeredCount;
    }

    const segment = await prisma.segment.update({
        where: { id },
        data: {
            ...data,
            ...(data.maxCapacity !== undefined && { seatsLeft }),
        },
    });

    return segment;
};

const deleteSegment = async (id: number) => {
    const existing = await prisma.segment.findUnique({
        where: { id },
        include: { _count: { select: { registrations: true } } },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Segment not found");
    }

    if (existing._count.registrations > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot delete a contest that already has registered participants"
        );
    }

    const segment = await prisma.segment.delete({
        where: { id },
    });

    return segment;
};

const cancelMyRegistration = async (segmentId: number, userId: number) => {
    const segment = await prisma.segment.findUnique({
        where: { id: segmentId },
    });
    if (!segment) {
        throw new AppError(status.NOT_FOUND, "Segment not found");
    }

    const registration = await prisma.segmentRegistration.findFirst({
        where: { segmentId, userId },
    });
    if (!registration) {
        throw new AppError(status.NOT_FOUND, "Registration not found");
    }

    if (registration.paymentStatus === "PAID") {
        throw new AppError(
            status.BAD_REQUEST,
            "Paid registrations cannot be self-cancelled. Please contact a Convenor."
        );
    }

    const deleted = await prisma.$transaction(async (tx) => {
        const del = await tx.segmentRegistration.delete({
            where: { id: registration.id },
        });

        const targetSegment = await tx.segment.findUnique({
            where: { id: segmentId },
        });
        if (targetSegment) {
            const newSeats = Math.min(targetSegment.seatsLeft + 1, targetSegment.maxCapacity);
            await tx.segment.update({
                where: { id: segmentId },
                data: { seatsLeft: newSeats },
            });
        }

        return del;
    });

    return deleted;
};

const removeParticipant = async (segmentId: number, registrationId: number) => {
    const segment = await prisma.segment.findUnique({
        where: { id: segmentId },
    });
    if (!segment) {
        throw new AppError(status.NOT_FOUND, "Segment not found");
    }

    const registration = await prisma.segmentRegistration.findFirst({
        where: { id: registrationId, segmentId },
    });
    if (!registration) {
        throw new AppError(status.NOT_FOUND, "Registration not found for this segment");
    }

    const deleted = await prisma.$transaction(async (tx) => {
        const del = await tx.segmentRegistration.delete({
            where: { id: registrationId },
        });

        const targetSegment = await tx.segment.findUnique({
            where: { id: segmentId },
        });
        if (targetSegment) {
            const newSeats = Math.min(targetSegment.seatsLeft + 1, targetSegment.maxCapacity);
            await tx.segment.update({
                where: { id: segmentId },
                data: { seatsLeft: newSeats },
            });
        }

        return del;
    });

    return deleted;
};

export const SegmentService = {
    createSegment,
    getAllSegments,
    getSegmentById,
    updateSegment,
    deleteSegment,
    cancelMyRegistration,
    removeParticipant,
};
