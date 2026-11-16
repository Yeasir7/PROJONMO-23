import { z } from "zod";

export const createInflowZodSchema = z.object({
    sourceTitle: z.string().min(1, "Source title is required"),
    category: z.enum(["SPONSOR", "DEPT_FUND", "OTHER"], {
        error: "Category must be one of: SPONSOR, DEPT_FUND, OTHER",
    }).optional(),
    amount: z.number().int("Amount must be an integer").min(1, "Amount must be at least 1"),
    notes: z.string().optional(),
});

export const FundInflowValidation = {
    createInflowZodSchema,
};
