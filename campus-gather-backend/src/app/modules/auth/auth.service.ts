import crypto from "node:crypto";
import bcrypt from "bcrypt";
import status from "http-status";
import { Role } from "@prisma/client";
import { envVars } from "../../config/env.js";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { jwtUtils } from "../../utils/jwt.js";
import { tokenUtils } from "../../utils/token.js";
import { sendBrevoPasswordEmail } from "../../utils/sendBrevoPasswordEmail.js";
import { ILoginPayload, IRegisterStudentPayload } from "./auth.interface.js";

const verifyStudent = async (studentId: string) => {
    const record = await prisma.allowedStudent.findUnique({
        where: { studentId },
    });

    if (!record) {
        throw new AppError(status.NOT_FOUND, "Student ID not found in NUBTK CSE department roster");
    }

    if (record.isClaimed) {
        throw new AppError(status.CONFLICT, "This Student ID has already registered for a Fest Pass");
    }

    return {
        studentId: record.studentId,
        fullName: record.fullName,
    };
};

const registerStudent = async (payload: IRegisterStudentPayload) => {
    return await prisma.$transaction(async (tx) => {
        const allowed = await tx.allowedStudent.findUnique({
            where: { studentId: payload.studentId },
        });

        if (!allowed) {
            throw new AppError(status.NOT_FOUND, "Student ID not found in NUBTK CSE department roster");
        }

        if (allowed.isClaimed) {
            throw new AppError(status.CONFLICT, "This Student ID has already registered for a Fest Pass");
        }

        const existingUser = await tx.user.findFirst({
            where: {
                OR: [
                    { email: payload.email },
                    { studentId: payload.studentId },
                ],
            },
        });

        if (existingUser) {
            throw new AppError(status.CONFLICT, "User with this email or student ID already exists");
        }

        const hashedPassword = await bcrypt.hash(payload.password, 10);

        const newUser = await tx.user.create({
            data: {
                name: allowed.fullName,
                email: payload.email,
                password: hashedPassword,
                studentId: payload.studentId,
                phone: payload.phone,
                sectionId: payload.sectionId,
                tshirtSize: payload.tshirtSize,
                role: Role.STUDENT,
            },
        });

        await tx.allowedStudent.update({
            where: { studentId: payload.studentId },
            data: { isClaimed: true },
        });

        const jwtPayload = {
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role,
            sectionId: newUser.sectionId,
        };

        const accessToken = tokenUtils.getAccessToken(jwtPayload);
        const refreshToken = tokenUtils.getRefreshToken(jwtPayload);

        const { password: _, ...userWithoutPassword } = newUser;
        return {
            accessToken,
            refreshToken,
            user: userWithoutPassword,
        };
    });
};

const loginUser = async (payload: ILoginPayload) => {
    const identifier = payload.email.trim();
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: identifier },
                { studentId: identifier },
            ],
        },
        include: { section: true },
    });

    if (!user) {
        throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
    }

    const isPasswordMatched = await bcrypt.compare(payload.password, user.password);

    if (!isPasswordMatched) {
        throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
    }

    const jwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        sectionId: user.sectionId,
    };

    const accessToken = tokenUtils.getAccessToken(jwtPayload);
    const refreshToken = tokenUtils.getRefreshToken(jwtPayload);

    const { password: _, ...safeUser } = user;

    return {
        accessToken,
        refreshToken,
        user: safeUser,
    };
};

const refreshToken = async (token: string) => {
    if (!token) {
        throw new AppError(status.UNAUTHORIZED, "Refresh token is required");
    }

    const verified = jwtUtils.verifyToken(token, envVars.JWT_REFRESH_SECRET);
    if (!verified.success || !verified.data) {
        throw new AppError(status.UNAUTHORIZED, "Invalid or expired refresh token");
    }

    const decoded = verified.data as { userId: number };

    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
    });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const jwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        sectionId: user.sectionId,
    };

    const accessToken = tokenUtils.getAccessToken(jwtPayload);

    return { accessToken };
};

const maskEmail = (email: string): string => {
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    const prefix = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
    return `${prefix}***@${domain}`;
};

const forgotPassword = async (payload: { identifier: string }) => {
    const trimmed = payload.identifier.trim();
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: trimmed, mode: "insensitive" } },
                { studentId: trimmed },
            ],
        },
    });

    if (!user) {
        throw new AppError(
            status.NOT_FOUND,
            "No registered student found with that Student ID or Email"
        );
    }

    if (user.passwordResetLastSentAt) {
        const elapsedMs = Date.now() - new Date(user.passwordResetLastSentAt).getTime();
        if (elapsedMs < 60000) {
            throw new AppError(
                status.TOO_MANY_REQUESTS,
                "Please wait 60 seconds before requesting another password reset email"
            );
        }
    }

    const tempPassword = `Fest#${crypto.randomInt(1000, 9999)}`;

    // Call Brevo email helper FIRST. If it fails, existing password is NOT modified.
    await sendBrevoPasswordEmail(user.email, user.name, user.studentId, tempPassword);

    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            passwordResetLastSentAt: new Date(),
        },
    });

    return {
        maskedEmail: maskEmail(user.email),
    };
};

export const AuthService = {
    verifyStudent,
    registerStudent,
    loginUser,
    refreshToken,
    forgotPassword,
};
