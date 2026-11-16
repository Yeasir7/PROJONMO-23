/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const createToken = (payload: JwtPayload, secret: string, options: SignOptions) => {
    return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string, secret: string) => {
    try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        return {
            success: true as const,
            data: decoded,
        };
    } catch (error: any) {
        return {
            success: false as const,
            message: error.message,
            error,
        };
    }
};

const decodeToken = (token: string) => {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
};

export const jwtUtils = {
    createToken,
    verifyToken,
    decodeToken,
};
