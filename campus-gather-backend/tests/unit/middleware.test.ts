import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import status from "http-status";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

import { prisma } from "../../src/app/lib/prisma.js";
import { validateRequest } from "../../src/app/middleware/validateRequest.js";
import { auth } from "../../src/app/middleware/auth.js";
import { globalErrorHandler } from "../../src/app/middleware/globalErrorHandler.js";
import AppError from "../../src/app/errorHelpers/AppError.js";
import { createMockToken, mockUsers } from "../helpers/jwt.helper.js";

// Mock Express Request, Response, Next
const createMockReqRes = (options: {
    body?: any;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
} = {}) => {
    const req: any = {
        body: options.body || {},
        headers: options.headers || {},
        cookies: options.cookies || {},
    };

    let responseStatus: number = 200;
    let responseData: any = null;

    const res: any = {
        status: (code: number) => {
            responseStatus = code;
            return res;
        },
        json: (data: any) => {
            responseData = data;
            return res;
        },
        getStatus: () => responseStatus,
        getData: () => responseData,
    };

    let nextError: any = null;
    let nextCalled = false;

    const next = (err?: any) => {
        nextCalled = true;
        if (err) nextError = err;
    };

    return { req, res, next, getNextError: () => nextError, wasNextCalled: () => nextCalled };
};

describe("Middleware Suite", () => {
    describe("validateRequest Middleware", () => {
        const schema = z.object({
            username: z.string().min(3),
            age: z.number().int(),
        });

        it("should pass sanitized data to req.body on valid input", async () => {
            const { req, res, next, getNextError, wasNextCalled } = createMockReqRes({
                body: { username: "alice", age: 25, extraIgnored: true },
            });

            const middleware = validateRequest(schema);
            await middleware(req, res, next);

            assert.equal(wasNextCalled(), true);
            assert.equal(getNextError(), null);
            assert.equal(req.body.username, "alice");
            assert.equal(req.body.age, 25);
            // Strict zod strip
            assert.equal(req.body.extraIgnored, undefined);
        });

        it("should forward ZodError to next() on invalid input", async () => {
            const { req, res, next, getNextError, wasNextCalled } = createMockReqRes({
                body: { username: "a", age: "not-a-number" },
            });

            const middleware = validateRequest(schema);
            await middleware(req, res, next);

            assert.equal(wasNextCalled(), true);
            const err = getNextError();
            assert.ok(err instanceof z.ZodError);
            assert.equal(err.issues.length >= 2, true);
        });

        it("should unpack req.body.data JSON string if provided (multipart form simulation)", async () => {
            const { req, res, next, getNextError } = createMockReqRes({
                body: { data: JSON.stringify({ username: "bob_ross", age: 50 }) },
            });

            const middleware = validateRequest(schema);
            await middleware(req, res, next);

            assert.equal(getNextError(), null);
            assert.equal(req.body.username, "bob_ross");
            assert.equal(req.body.age, 50);
        });
    });

    describe("auth Middleware", () => {
        const originalFindUnique = prisma.user.findUnique;

        beforeEach(() => {
            (prisma.user.findUnique as any) = async ({ where }: any) => {
                const found = Object.values(mockUsers).find((u) => u.userId === where.id);
                if (found) {
                    return {
                        id: found.userId,
                        email: found.email,
                        role: found.role,
                        sectionId: found.sectionId,
                    };
                }
                return null;
            };
        });

        afterEach(() => {
            prisma.user.findUnique = originalFindUnique;
        });

        it("should throw 401 AppError when no token is present", async () => {
            const { req, res, next, getNextError } = createMockReqRes();
            const middleware = auth();

            await middleware(req, res, next);

            const err = getNextError();
            assert.ok(err instanceof AppError);
            assert.equal(err.statusCode, status.UNAUTHORIZED);
            assert.equal(err.message, "You are not authorized");
        });

        it("should throw 401 when token is invalid or forged", async () => {
            const { req, res, next, getNextError } = createMockReqRes({
                headers: { authorization: "Bearer invalid.jwt.token" },
            });
            const middleware = auth();

            await middleware(req, res, next);

            const err = getNextError();
            assert.ok(err instanceof Error);
        });

        it("should accept valid token from Authorization header and populate req.user", async () => {
            const token = createMockToken(mockUsers.superAdmin);
            const { req, res, next, getNextError, wasNextCalled } = createMockReqRes({
                headers: { authorization: `Bearer ${token}` },
            });

            const middleware = auth();
            await middleware(req, res, next);

            assert.equal(wasNextCalled(), true);
            assert.equal(getNextError(), null);
            assert.equal(req.user.email, mockUsers.superAdmin.email);
            assert.equal(req.user.role, Role.SUPER_ADMIN);
        });

        it("should accept valid token from cookies (accessToken)", async () => {
            const token = createMockToken(mockUsers.convenor);
            const { req, res, next, getNextError } = createMockReqRes({
                cookies: { accessToken: token },
            });

            const middleware = auth();
            await middleware(req, res, next);

            assert.equal(getNextError(), null);
            assert.equal(req.user.role, Role.CONVENOR);
        });

        it("should throw 403 Forbidden when user role is not authorized", async () => {
            const token = createMockToken(mockUsers.studentSection1);
            const { req, res, next, getNextError } = createMockReqRes({
                headers: { authorization: `Bearer ${token}` },
            });

            // Require SUPER_ADMIN or CONVENOR
            const middleware = auth(Role.SUPER_ADMIN, Role.CONVENOR);
            await middleware(req, res, next);

            const err = getNextError();
            assert.ok(err instanceof AppError);
            assert.equal(err.statusCode, status.FORBIDDEN);
            assert.equal(err.message, "You do not have permission to access this resource");
        });

        it("should allow access when user role matches one of the required roles", async () => {
            const token = createMockToken(mockUsers.convenor);
            const { req, res, next, getNextError } = createMockReqRes({
                headers: { authorization: `Bearer ${token}` },
            });

            const middleware = auth(Role.SUPER_ADMIN, Role.CONVENOR);
            await middleware(req, res, next);

            assert.equal(getNextError(), null);
            assert.equal(req.user.role, Role.CONVENOR);
        });
    });

    describe("globalErrorHandler Middleware", () => {
        it("should format ZodError into 400 Bad Request response with errorSources", () => {
            const schema = z.object({ email: z.string().email() });
            const parseResult = schema.safeParse({ email: "invalid-email" });
            assert.equal(parseResult.success, false);

            const { req, res, next } = createMockReqRes();
            globalErrorHandler(parseResult.error, req, res, next);

            assert.equal(res.getStatus(), status.BAD_REQUEST);
            const data = res.getData();
            assert.equal(data.success, false);
            assert.equal(data.message, "Zod Validation Error");
            assert.ok(Array.isArray(data.errorSources));
            assert.equal(data.errorSources[0].path, "email");
        });

        it("should format AppError into custom status and message", () => {
            const appErr = new AppError(status.CONFLICT, "Resource conflict occurred");
            const { req, res, next } = createMockReqRes();

            globalErrorHandler(appErr, req, res, next);

            assert.equal(res.getStatus(), status.CONFLICT);
            const data = res.getData();
            assert.equal(data.success, false);
            assert.equal(data.message, "Resource conflict occurred");
        });

        it("should format generic Error into 500 Internal Server Error", () => {
            const genericErr = new Error("Unexpected database explosion");
            const { req, res, next } = createMockReqRes();

            globalErrorHandler(genericErr, req, res, next);

            assert.equal(res.getStatus(), status.INTERNAL_SERVER_ERROR);
            const data = res.getData();
            assert.equal(data.success, false);
            assert.equal(data.message, "Unexpected database explosion");
        });
    });
});
