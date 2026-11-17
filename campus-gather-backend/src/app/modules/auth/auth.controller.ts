import { Request, Response } from "express";
import status from "http-status";
import { envVars } from "../../config/env.js";
import AppError from "../../errorHelpers/AppError.js";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { CookieUtils } from "../../utils/cookie.js";
import { tokenUtils } from "../../utils/token.js";
import { AuthService } from "./auth.service.js";

const cookieOptions = {
    httpOnly: true,
    secure: envVars.NODE_ENV === "production",
    sameSite: (envVars.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    path: "/",
};

const verifyStudent = catchAsync(async (req: Request, res: Response) => {
    const studentId = String(req.params.studentId);
    const result = await AuthService.verifyStudent(studentId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Student verified successfully",
        data: result,
    });
});

const registerStudent = catchAsync(async (req: Request, res: Response) => {
    if (!req.body.credential) {
        throw new AppError(
            status.UNAUTHORIZED,
            "Direct registration is disabled. Google OAuth verification credential is required."
        );
    }
    const result = await AuthService.googleRegisterStudent({
        studentId: req.body.studentId,
        credential: req.body.credential,
        password: req.body.password,
        phone: req.body.phone,
        sectionId: Number(req.body.sectionId),
        tshirtSize: req.body.tshirtSize,
    });
    const { accessToken, refreshToken } = result;

    if (accessToken) {
        tokenUtils.setAccessTokenCookie(res, accessToken);
    }
    if (refreshToken) {
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
    }

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Student registered successfully",
        data: result,
    });
});

const googleRegisterStudent = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.googleRegisterStudent(req.body);
    const { accessToken, refreshToken } = result;

    if (accessToken) {
        tokenUtils.setAccessTokenCookie(res, accessToken);
    }
    if (refreshToken) {
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
    }

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Student registered successfully with Google",
        data: result,
    });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.googleLogin(req.body);
    const { accessToken, refreshToken, user } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User logged in successfully with Google",
        data: {
            accessToken,
            refreshToken,
            user,
        },
    });
});

const login = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.loginUser(req.body);
    const { accessToken, refreshToken, user } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User logged in successfully",
        data: {
            accessToken,
            refreshToken,
            user,
        },
    });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
    const token = CookieUtils.getCookie(req, "refreshToken") || req.body?.refreshToken;
    const result = await AuthService.refreshToken(token);

    tokenUtils.setAccessTokenCookie(res, result.accessToken);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Access token refreshed successfully",
        data: result,
    });
});

const logout = catchAsync(async (req: Request, res: Response) => {
    tokenUtils.clearAccessTokenCookie(res);
    tokenUtils.clearRefreshTokenCookie(res);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Logged out successfully",
    });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.forgotPassword(req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Password recovery email sent successfully",
        data: result,
    });
});

export const AuthController = {
    verifyStudent,
    registerStudent,
    googleRegisterStudent,
    googleLogin,
    login,
    refreshToken,
    logout,
    forgotPassword,
};
