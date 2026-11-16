import status from "http-status";
import { Role, SegmentPaymentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errorHelpers/AppError.js";

const registerForSegment = async (
    userId: number,
    data: { segmentId: number; teamOrDetails?: string },
    currentUser?: { userId: number; role: string }
) => {
    const segment = await prisma.segment.findUnique({
        where: { id: data.segmentId },
    });

    if (!segment) {
        throw new AppError(status.NOT_FOUND, "Segment not found");
    }

    const existingRegistration = await prisma.segmentRegistration.findUnique({
        where: {
            segmentId_userId: {
                segmentId: data.segmentId,
                userId,
            },
        },
    });

    if (existingRegistration) {
        throw new AppError(status.CONFLICT, "You are already registered for this segment");
    }

    if (segment.seatsLeft <= 0) {
        throw new AppError(status.BAD_REQUEST, "No seats available for this segment");
    }

    const initialPaymentStatus: SegmentPaymentStatus =
        segment.registrationFee === 0
            ? SegmentPaymentStatus.FREE
            : SegmentPaymentStatus.PENDING;

    const registration = await prisma.$transaction(async (tx) => {
        // Concurrency-safe atomic check and decrement
        const updatedSegment = await tx.segment.updateMany({
            where: { id: data.segmentId, seatsLeft: { gt: 0 } },
            data: { seatsLeft: { decrement: 1 } },
        });

        if (updatedSegment.count === 0) {
            throw new AppError(status.BAD_REQUEST, "No seats left for this segment");
        }

        const created = await tx.segmentRegistration.create({
            data: {
                segmentId: data.segmentId,
                userId,
                teamOrDetails: data.teamOrDetails,
                paymentStatus: initialPaymentStatus,
            },
            include: {
                segment: true,
                user: { select: { id: true, name: true, studentId: true, email: true } },
            },
        });

        return created;
    });

    return registration;
};

const getMyRegistrations = async (userId: number) => {
    const registrations = await prisma.segmentRegistration.findMany({
        where: { userId },
        include: { segment: true },
        orderBy: { registeredAt: "desc" },
    });

    return registrations;
};

const getAllRegistrations = async (query?: {
    segmentId?: string;
    page?: string;
    limit?: string;
}) => {
    const where: Record<string, unknown> = {};

    if (query?.segmentId) {
        where.segmentId = Number(query.segmentId);
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(2000, Number(query?.limit) || 2000));
    const skip = (page - 1) * limit;

    const [total, registrations] = await Promise.all([
        prisma.segmentRegistration.count({ where }),
        prisma.segmentRegistration.findMany({
            where,
            include: {
                segment: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        registrationFee: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        studentId: true,
                        email: true,
                        phone: true,
                    },
                },
            },
            orderBy: { registeredAt: "desc" },
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
        data: registrations,
    };
};

const updatePaymentStatus = async (id: number, paymentStatus: string) => {
    const existing = await prisma.segmentRegistration.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Registration not found");
    }

    const registration = await prisma.segmentRegistration.update({
        where: { id },
        data: { paymentStatus: paymentStatus as SegmentPaymentStatus },
        include: {
            segment: true,
            user: { select: { id: true, name: true, studentId: true } },
        },
    });

    return registration;
};

const cancelRegistration = async (
    id: number,
    requestingUser?: { userId: number; role: string }
) => {
    const registration = await prisma.segmentRegistration.findUnique({
        where: { id },
    });

    if (!registration) {
        throw new AppError(status.NOT_FOUND, "Registration not found");
    }

    if (
        requestingUser &&
        requestingUser.role !== Role.SUPER_ADMIN &&
        requestingUser.role !== Role.CONVENOR &&
        registration.userId !== requestingUser.userId
    ) {
        throw new AppError(status.FORBIDDEN, "You do not have permission to cancel this registration");
    }

    if (
        registration.paymentStatus === SegmentPaymentStatus.PAID &&
        requestingUser &&
        requestingUser.role !== Role.SUPER_ADMIN &&
        requestingUser.role !== Role.CONVENOR
    ) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot cancel a contest registration after entry fee has been marked PAID. Contact a Convenor."
        );
    }

    const result = await prisma.$transaction(async (tx) => {
        const deleted = await tx.segmentRegistration.delete({
            where: { id },
        });

        await tx.segment.update({
            where: { id: registration.segmentId },
            data: { seatsLeft: { increment: 1 } },
        });

        return deleted;
    });

    return result;
};

export const SegmentRegistrationService = {
    registerForSegment,
    getMyRegistrations,
    getAllRegistrations,
    updatePaymentStatus,
    cancelRegistration,
};
