import { z } from "zod";

export const createRegistrationZodSchema = z.object({
    segmentId: z.number().int(),
    teamOrDetails: z.string().optional(),
});

export const updatePaymentStatusZodSchema = z.object({
    paymentStatus: z.enum(["FREE", "PENDING", "PAID"]),
});

export const SegmentRegistrationValidation = {
    createRegistrationZodSchema,
    updatePaymentStatusZodSchema,
};
