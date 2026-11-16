import { z } from "zod";

const updateUserRoleZodSchema = z.object({
    role: z.enum(["SUPER_ADMIN", "CONVENOR", "CR", "STUDENT"]),
});

const updateFeeStatusZodSchema = z.object({
    festFeeStatus: z.enum(["UNPAID", "PAID_TO_CR"]),
    paidAmount: z.number().int().optional(),
});

const updateKitStatusZodSchema = z.object({
    kitDelivered: z.boolean(),
});

const whitelistStudentZodSchema = z.object({
    studentId: z.string().min(1, "Student ID is required"),
    fullName: z.string().min(1, "Full name is required"),
});

const updateMyProfileZodSchema = z.object({
    email: z.string().email("Invalid email address").optional(),
    phone: z.string().min(7, "Phone number must be at least 7 characters").optional(),
    tshirtSize: z.enum(["S", "M", "L", "XL", "XXL"]).optional(),
    sectionId: z.number().int().positive().optional(),
    newPassword: z.string().min(6, "Password must be at least 6 characters long").optional(),
});

export const UserValidation = {
    updateUserRoleZodSchema,
    updateFeeStatusZodSchema,
    updateKitStatusZodSchema,
    whitelistStudentZodSchema,
    updateMyProfileZodSchema,
};
