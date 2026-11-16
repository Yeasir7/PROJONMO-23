import { z } from "zod";

const createSectionZodSchema = z.object({
    semester: z.number().int("Semester must be an integer"),
    sectionName: z.string().min(1, "Section name is required"),
    code: z.string().min(1, "Code is required"),
    festFee: z.number().int("Fest fee must be an integer").optional(),
});

const updateSectionZodSchema = createSectionZodSchema.partial();

const updateSemesterFeeZodSchema = z.object({
    semester: z.number().int().min(1).max(8),
    festFee: z.number().int().min(0, "Fest fee must be at least 0"),
});

export const SectionValidation = {
    createSectionZodSchema,
    updateSectionZodSchema,
    updateSemesterFeeZodSchema,
};
