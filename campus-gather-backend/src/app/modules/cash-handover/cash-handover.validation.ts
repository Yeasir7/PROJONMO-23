import { z } from "zod";

export const createHandoverZodSchema = z.object({
    sectionId: z.number().int().optional(),
    receivedById: z.number().int(),
    amount: z.number().int().min(1, "Amount must be at least 1"),
    notes: z.string().optional(),
});

export const verifyHandoverZodSchema = z.object({
    status: z.enum(["VERIFIED"]).default("VERIFIED").optional(),
});

export const CashHandoverValidation = {
    createHandoverZodSchema,
    verifyHandoverZodSchema,
};
