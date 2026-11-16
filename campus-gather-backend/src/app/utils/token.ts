import { CookieOptions, Response } from "express";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { envVars } from "../config/env.js";
import { CookieUtils } from "./cookie.js";
import { jwtUtils } from "./jwt.js";

const getAccessToken = (payload: JwtPayload) => {
    return jwtUtils.createToken(payload, envVars.JWT_ACCESS_SECRET, {
        expiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
    } as SignOptions);
};

const getRefreshToken = (payload: JwtPayload) => {
    return jwtUtils.createToken(payload, envVars.JWT_REFRESH_SECRET, {
        expiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);
};

const getBaseCookieOptions = (): CookieOptions => ({
    httpOnly: true,
    secure: envVars.NODE_ENV === "production",
    sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
});

const setAccessTokenCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, "accessToken", token, {
        ...getBaseCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
};

const setRefreshTokenCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, "refreshToken", token, {
        ...getBaseCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

const clearAccessTokenCookie = (res: Response) => {
    CookieUtils.clearCookie(res, "accessToken", getBaseCookieOptions());
};

const clearRefreshTokenCookie = (res: Response) => {
    CookieUtils.clearCookie(res, "refreshToken", getBaseCookieOptions());
};

export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAccessTokenCookie,
    clearRefreshTokenCookie,
    getBaseCookieOptions,
};
