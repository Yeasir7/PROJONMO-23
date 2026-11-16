import { z } from "zod";

const createCommitteeZodSchema = z.object({
    name: z.string().min(1, "Committee name is required"),
    description: z.string().optional(),
    allocatedBudget: z.number().int().optional(),
});

const updateCommitteeZodSchema = createCommitteeZodSchema.partial();

const addMemberZodSchema = z.object({
    userId: z.number().int("User ID must be an integer"),
    designation: z.enum(["LEAD", "MEMBER"]).optional(),
});

const updateMemberDesignationZodSchema = z.object({
    designation: z.enum(["LEAD", "MEMBER"]),
});

export const CommitteeValidation = {
    createCommitteeZodSchema,
    updateCommitteeZodSchema,
    addMemberZodSchema,
    updateMemberDesignationZodSchema,
};
