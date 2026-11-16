import status from "http-status";
import { envVars } from "../config/env.js";
import AppError from "../errorHelpers/AppError.js";
import { IRequestUser } from "../interfaces/requestUser.interface.js";
import { prisma } from "../lib/prisma.js";
import { catchAsync } from "../shared/catchAsync.js";
import { CookieUtils } from "../utils/cookie.js";
import { jwtUtils } from "../utils/jwt.js";

export const auth = (...requiredRoles: string[]) =>
    catchAsync(async (req, res, next) => {
        const authorization = req.headers.authorization;
        const token =
            CookieUtils.getCookie(req, "accessToken") ||
            authorization?.replace(/^Bearer\s+/i, "");

        if (!token) {
            throw new AppError(status.UNAUTHORIZED, "You are not authorized");
        }

        const verified = jwtUtils.verifyToken(token, envVars.JWT_ACCESS_SECRET);
        if (!verified.success || !verified.data) {
            throw new AppError(status.UNAUTHORIZED, "Invalid or expired token");
        }

        const decoded = verified.data as unknown as IRequestUser & { id?: number };
        const userId = decoded.userId ?? decoded.id;

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, sectionId: true },
        });

        if (!dbUser) {
            if (typeof res.clearCookie === "function") {
                res.clearCookie("accessToken", { path: "/" });
                res.clearCookie("refreshToken", { path: "/" });
            }
            throw new AppError(
                status.UNAUTHORIZED,
                "Session expired or user no longer exists. Please sign in again."
            );
        }

        if (requiredRoles.length > 0 && !requiredRoles.includes(dbUser.role)) {
            throw new AppError(
                status.FORBIDDEN,
                "You do not have permission to access this resource"
            );
        }

        req.user = {
            userId: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            sectionId: dbUser.sectionId,
        };
        next();
    });
