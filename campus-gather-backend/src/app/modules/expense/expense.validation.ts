import { z } from "zod";

export const createExpenseZodSchema = z.object({
    committeeId: z.number().int("Committee ID must be an integer"),
    itemTitle: z.string().min(1, "Item title is required"),
    amount: z.number().int("Amount must be an integer").min(1, "Amount must be at least 1"),
    voucherNote: z.string().optional(),
});

export const ExpenseValidation = {
    createExpenseZodSchema,
};
