import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Role } from "@prisma/client";
import app from "../../src/app.js";
import { prisma } from "../../src/app/lib/prisma.js";
import { createMockToken, mockUsers } from "../helpers/jwt.helper.js";

describe("API Integration & HTTP Boundary Suite", () => {
    let server: http.Server;
    let baseUrl: string;

    before(async () => {
        let [superAdmin, convenor, cr, student] = await Promise.all([
            prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } }),
            prisma.user.findFirst({ where: { role: Role.CONVENOR } }),
            prisma.user.findFirst({ where: { role: Role.CR } }),
            prisma.user.findFirst({ where: { role: Role.STUDENT } }),
        ]);

        if (!convenor) {
            convenor = await prisma.user.upsert({
                where: { email: "convenor@test.cse" },
                update: {},
                create: {
                    name: "Test Convenor",
                    email: "convenor@test.cse",
                    password: "password123",
                    role: Role.CONVENOR,
                    tshirtSize: "L",
                },
            });
        }

        if (!cr) {
            const section = await prisma.section.findFirst();
            cr = await prisma.user.upsert({
                where: { email: "cr@test.cse" },
                update: {},
                create: {
                    name: "Test CR",
                    email: "cr@test.cse",
                    password: "password123",
                    role: Role.CR,
                    tshirtSize: "L",
                    sectionId: section?.id,
                },
            });
        }

        if (!student) {
            const section = await prisma.section.findFirst();
            student = await prisma.user.upsert({
                where: { email: "student@test.cse" },
                update: {},
                create: {
                    name: "Test Student",
                    email: "student@test.cse",
                    studentId: "11210320676",
                    password: "password123",
                    role: Role.STUDENT,
                    tshirtSize: "L",
                    sectionId: section?.id,
                },
            });
        }

        if (superAdmin) {
            mockUsers.superAdmin.userId = superAdmin.id;
            mockUsers.superAdmin.email = superAdmin.email;
        }
        if (convenor) {
            mockUsers.convenor.userId = convenor.id;
            mockUsers.convenor.email = convenor.email;
        }
        if (cr) {
            mockUsers.crSection1.userId = cr.id;
            mockUsers.crSection1.email = cr.email;
            mockUsers.crSection1.sectionId = cr.sectionId;
        }
        if (student) {
            mockUsers.studentSection1.userId = student.id;
            mockUsers.studentSection1.email = student.email;
            mockUsers.studentSection1.sectionId = student.sectionId;
        }

        await new Promise<void>((resolve) => {
            server = app.listen(0, "127.0.0.1", () => {
                const address = server.address() as any;
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    });

    after(async () => {
        await prisma.user.deleteMany({
            where: { email: { in: ["convenor@test.cse", "cr@test.cse", "student@test.cse"] } },
        });
        await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
        await prisma.$disconnect();
    });

    describe("General Endpoints", () => {
        it("GET / should return 200 with API status", async () => {
            const res = await fetch(`${baseUrl}/`);
            assert.equal(res.status, 200);

            const json: any = await res.json();
            assert.equal(json.success, true);
            assert.equal(json.message, "API is working");
        });

        it("GET /non-existent-route should return 404 Not Found", async () => {
            const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
            assert.equal(res.status, 404);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.match(json.message, /Not Found/i);
        });
    });

    describe("Authentication Enforcement", () => {
        it("GET /api/v1/users/me should reject with 401 when no token is passed", async () => {
            const res = await fetch(`${baseUrl}/api/v1/users/me`);
            assert.equal(res.status, 401);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.equal(json.message, "You are not authorized");
        });

        it("PATCH /api/v1/users/me should reject with 401 when no token is passed", async () => {
            const res = await fetch(`${baseUrl}/api/v1/users/me`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tshirtSize: "XL" }),
            });
            assert.equal(res.status, 401);
        });

        it("PATCH /api/v1/users/me should allow authenticated student to update profile preferences", async () => {
            const token = createMockToken(mockUsers.studentSection1);
            const res = await fetch(`${baseUrl}/api/v1/users/me`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tshirtSize: "XL" }),
            });
            assert.equal(res.status, 200);
            const json: any = await res.json();
            assert.equal(json.success, true);
            assert.equal(json.data.tshirtSize, "XL");
        });

        it("GET /api/v1/sections/1 should reject with 401 when invalid token is passed", async () => {
            const res = await fetch(`${baseUrl}/api/v1/sections/1`, {
                headers: { Authorization: "Bearer bogus_token_value" },
            });
            assert.equal(res.status, 401);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.equal(json.message, "Invalid or expired token");
        });

        it("POST /api/v1/committees should reject with 401 when unauthenticated", async () => {
            const res = await fetch(`${baseUrl}/api/v1/committees`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Testing" }),
            });
            assert.equal(res.status, 401);
        });

        it("POST /api/v1/auth/logout should clear session cookies and return 200", async () => {
            const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
                method: "POST",
            });
            assert.equal(res.status, 200);

            const json: any = await res.json();
            assert.equal(json.success, true);
            assert.match(json.message, /Logged out successfully/i);

            // Verify Set-Cookie headers contain expiration or clear instructions
            const cookies = res.headers.get("set-cookie");
            assert.ok(cookies);
            assert.match(cookies, /accessToken=/);
        });

        it("POST /api/v1/auth/refresh-token should reject with 401 when no refresh token provided", async () => {
            const res = await fetch(`${baseUrl}/api/v1/auth/refresh-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            assert.equal(res.status, 401);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.match(json.message, /Refresh token is required/i);
        });
    });

    describe("Role-Based Access Control (RBAC) Enforcement", () => {
        it("POST /api/v1/committees should reject Student with 403 Forbidden", async () => {
            const token = createMockToken(mockUsers.studentSection1);
            const res = await fetch(`${baseUrl}/api/v1/committees`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: "Hacked Committee" }),
            });
            assert.equal(res.status, 403);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.equal(json.message, "You do not have permission to access this resource");
        });

        it("PATCH /api/v1/users/1/role should reject Student with 403 Forbidden", async () => {
            const token = createMockToken(mockUsers.studentSection1);
            const res = await fetch(`${baseUrl}/api/v1/users/1/role`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ role: "SUPER_ADMIN" }),
            });
            assert.equal(res.status, 403);
        });

        it("POST /api/v1/committees should reject CR with 403 Forbidden", async () => {
            const token = createMockToken(mockUsers.crSection1);
            const res = await fetch(`${baseUrl}/api/v1/committees`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: "CR Committee" }),
            });
            assert.equal(res.status, 403);
        });

        it("POST /api/v1/cash-handovers should reject Student with 403 Forbidden (CR only)", async () => {
            const token = createMockToken(mockUsers.studentSection1);
            const res = await fetch(`${baseUrl}/api/v1/cash-handovers`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ receivedById: 2, amount: 5000 }),
            });
            assert.equal(res.status, 403);
        });

        it("POST /api/v1/committees should allow Super Admin past auth into validation check", async () => {
            const token = createMockToken(mockUsers.superAdmin);
            const res = await fetch(`${baseUrl}/api/v1/committees`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}), // Empty body triggers validation error, proving auth passed
            });
            assert.equal(res.status, 400);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.equal(json.message, "Zod Validation Error");
        });
    });

    describe("HTTP Input Validation & Error Formatting", () => {
        it("POST /api/v1/auth/register with invalid email should return 400 with structured Zod errors", async () => {
            const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Tanvir",
                    email: "invalid-email-format",
                    password: "pass",
                    studentId: "1123",
                    phone: "017",
                    sectionId: 1,
                    tshirtSize: "INVALID_SIZE",
                }),
            });
            assert.equal(res.status, 400);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.equal(json.message, "Zod Validation Error");
            assert.ok(Array.isArray(json.errorSources));
            assert.ok(json.errorSources.length >= 3);
        });

        it("POST /api/v1/auth/login with missing credentials should return 400", async () => {
            const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "valid@email.com" }),
            });
            assert.equal(res.status, 400);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.equal(json.message, "Zod Validation Error");
        });

        it("POST /api/v1/auth/forgot-password with missing identifier should return 400", async () => {
            const res = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            assert.equal(res.status, 400);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.equal(json.message, "Zod Validation Error");
        });

        it("POST /api/v1/auth/forgot-password with non-existent student should return 404", async () => {
            const res = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: "nonexistent_ghost_roll_9999" }),
            });
            assert.equal(res.status, 404);

            const json: any = await res.json();
            assert.equal(json.success, false);
            assert.match(json.message, /No registered student found/i);
        });

        it("POST /api/v1/auth/forgot-password should generate new password, enforce 60s cooldown, and allow login", async () => {
            const originalLog = console.log;
            let capturedPassword = "";
            console.log = (...args: any[]) => {
                const text = args.join(" ");
                const match = text.match(/Generated Password:\s*(\S+)/);
                if (match) {
                    capturedPassword = match[1];
                }
                originalLog(...args);
            };

            try {
                // Ensure student user exists and clear any cooldown
                await prisma.user.updateMany({
                    where: { email: mockUsers.studentSection1.email },
                    data: { passwordResetLastSentAt: null },
                });

                const res = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier: mockUsers.studentSection1.email }),
                });
                assert.equal(res.status, 200);
                const json: any = await res.json();
                assert.equal(json.success, true);
                assert.ok(json.data.maskedEmail);

                assert.ok(capturedPassword, "Generated password must be logged in dev mode");

                // Now test logging in with the newly generated password
                const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: mockUsers.studentSection1.email,
                        password: capturedPassword,
                    }),
                });
                assert.equal(loginRes.status, 200);
                const loginJson: any = await loginRes.json();
                assert.equal(loginJson.success, true);
                assert.ok(loginJson.data.accessToken);

                // Immediate retry should trigger 429 Too Many Requests (60-second cooldown)
                const cooldownRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier: mockUsers.studentSection1.email }),
                });
                assert.equal(cooldownRes.status, 429);
                const cooldownJson: any = await cooldownRes.json();
                assert.match(cooldownJson.message, /wait 60 seconds/i);
            } finally {
                console.log = originalLog;
            }
        });
    });
});
