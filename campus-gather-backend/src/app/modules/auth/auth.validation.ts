import { z } from "zod";

export const registerStudentZodSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    email: z.string().email("Invalid email address"),
    password: z
        .string({ error: "Password is required" })
        .min(6, "Password must be at least 6 characters long"),
    studentId: z
        .string({ error: "Student ID is required" })
        .min(1, "Student ID is required"),
    phone: z.string({ error: "Phone is required" }).min(1, "Phone is required"),
    sectionId: z.number().int("Section ID must be an integer"),
    tshirtSize: z.enum(["S", "M", "L", "XL", "XXL"], {
        error: "T-shirt size must be one of: S, M, L, XL, XXL",
    }),
});

export const loginZodSchema = z.object({
    email: z
        .string({ error: "Student ID or Email is required" })
        .min(1, "Student ID or Email is required"),
    password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export const refreshTokenZodSchema = z.object({
    refreshToken: z.string().optional(),
});

export const forgotPasswordZodSchema = z.object({
    identifier: z.string().min(1, "Student ID or Email is required"),
});

export const AuthValidation = {
    registerStudentZodSchema,
    loginZodSchema,
    refreshTokenZodSchema,
    forgotPasswordZodSchema,
};
