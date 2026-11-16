import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { AnalyticsService } from "./analytics.service.js";

const getSummary = catchAsync(async (req: Request, res: Response) => {
    const result = await AnalyticsService.getSummary();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Analytics summary retrieved successfully",
        data: result,
    });
});

export const AnalyticsController = {
    getSummary,
};
