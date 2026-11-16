import { z } from "zod";

export const createSegmentZodSchema = z.object({
    title: z.string().min(1, "Title is required"),
    category: z.string().min(1, "Category is required"),
    participationType: z.enum(["SOLO", "TEAM"]).optional(),
    registrationFee: z.number().int().min(0).optional(),
    maxCapacity: z.number().int().min(1).optional(),
    description: z.string().optional(),
});

export const updateSegmentZodSchema = z.object({
    title: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    participationType: z.enum(["SOLO", "TEAM"]).optional(),
    registrationFee: z.number().int().min(0).optional(),
    maxCapacity: z.number().int().min(1).optional(),
    description: z.string().optional(),
});

export const SegmentValidation = {
    createSegmentZodSchema,
    updateSegmentZodSchema,
};
