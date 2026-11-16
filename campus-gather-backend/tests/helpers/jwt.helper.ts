import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret";

export interface MockUserPayload {
    userId: number;
    email: string;
    role: Role;
    sectionId: number | null;
}

export const createMockToken = (user: MockUserPayload): string => {
    return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
};

export const mockUsers = {
    superAdmin: {
        userId: 1,
        email: "superadmin@fest.cse",
        role: Role.SUPER_ADMIN,
        sectionId: null,
    },
    convenor: {
        userId: 2,
        email: "convenor@fest.cse",
        role: Role.CONVENOR,
        sectionId: null,
    },
    crSection1: {
        userId: 4,
        email: "cr1@fest.cse",
        role: Role.CR,
        sectionId: 1,
    },
    crSection2: {
        userId: 5,
        email: "cr2@fest.cse",
        role: Role.CR,
        sectionId: 2,
    },
    studentSection1: {
        userId: 6,
        email: "student1@fest.cse",
        role: Role.STUDENT,
        sectionId: 1,
    },
    studentSection2: {
        userId: 7,
        email: "student2@fest.cse",
        role: Role.STUDENT,
        sectionId: 2,
    },
};
