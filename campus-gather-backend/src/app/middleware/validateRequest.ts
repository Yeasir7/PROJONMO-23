import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodSchema: z.ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        req.body = req.body ?? {};

        if (req.body?.data) {
            try {
                req.body = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
            } catch {
                // Keep raw body if JSON.parse fails
            }
        }

        const parsedResult = await zodSchema.safeParseAsync(req.body);

        if (!parsedResult.success) {
            return next(parsedResult.error);
        }

        // Sanitizing the data
        req.body = parsedResult.data;

        next();
    };
};