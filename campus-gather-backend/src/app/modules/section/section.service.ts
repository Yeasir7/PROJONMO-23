import status from "http-status";
import { Role } from "@prisma/client";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";

const createSection = async (data: {
    semester: number;
    sectionName: string;
    code: string;
    festFee?: number;
}) => {
    const existing = await prisma.section.findUnique({
        where: { code: data.code },
    });
    if (existing) {
        throw new AppError(status.CONFLICT, "Section with this code already exists");
    }

    const section = await prisma.section.create({ data });
    return section;
};

const getAllSections = async () => {
    const sections = await prisma.section.findMany({
        include: {
            _count: {
                select: { users: true, handovers: true },
            },
        },
        orderBy: [{ semester: "asc" }, { sectionName: "asc" }],
    });
    return sections;
};

const getSectionById = async (
    id: number,
    requestingUser?: { role: string; sectionId: number | null }
) => {
    if (
        requestingUser &&
        (requestingUser.role === Role.STUDENT || requestingUser.role === Role.CR)
    ) {
        if (requestingUser.sectionId !== id) {
            throw new AppError(
                status.FORBIDDEN,
                "You do not have permission to view other sections"
            );
        }
    }

    const section = await prisma.section.findUnique({
        where: { id },
        include: {
            users: {
                select: {
                    id: true,
                    name: true,
                    studentId: true,
                    festFeeStatus: true,
                    paidAmount: true,
                    kitDelivered: true,
                    role: true,
                    committeeMembers: {
                        include: {
                            committee: { select: { id: true, name: true } },
                        },
                    },
                },
            },
            handovers: {
                include: {
                    cr: { select: { id: true, name: true } },
                    receivedBy: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (!section) {
        throw new AppError(status.NOT_FOUND, "Section not found");
    }

    return {
        ...section,
        users: section.users.map((u) => ({
            ...u,
            committeeMemberships: u.committeeMembers,
        })),
    };
};

const updateSection = async (
    id: number,
    data: {
        semester?: number;
        sectionName?: string;
        code?: string;
        festFee?: number;
    }
) => {
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Section not found");
    }

    const section = await prisma.section.update({
        where: { id },
        data,
    });
    return section;
};

const deleteSection = async (id: number) => {
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Section not found");
    }

    const [userCount, handoverCount] = await Promise.all([
        prisma.user.count({ where: { sectionId: id } }),
        prisma.cashHandover.count({ where: { sectionId: id } }),
    ]);

    if (userCount > 0 || handoverCount > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot delete a section that has registered students or cash handovers"
        );
    }

    const section = await prisma.section.delete({
        where: { id },
    });
    return section;
};

const updateSemesterFee = async (payload: { semester: number; festFee: number }) => {
    const { semester, festFee } = payload;
    const updateResult = await prisma.section.updateMany({
        where: { semester },
        data: { festFee },
    });

    return {
        semester,
        festFee,
        updatedSectionsCount: updateResult.count,
    };
};

export const SectionService = {
    createSection,
    getAllSections,
    getSectionById,
    updateSection,
    updateSemesterFee,
    deleteSection,
};
