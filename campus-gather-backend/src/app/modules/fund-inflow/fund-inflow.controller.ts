import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { FundInflowService } from "./fund-inflow.service.js";

const createInflow = catchAsync(async (req: Request, res: Response) => {
    const result = await FundInflowService.createInflow(req.user.userId, req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Fund inflow created successfully",
        data: result,
    });
});

const getAllInflows = catchAsync(async (req: Request, res: Response) => {
    const result = await FundInflowService.getAllInflows(
        req.query as { category?: string; page?: string; limit?: string }
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Fund inflows fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getInflowById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Inflow ID must be a valid number",
        });
        return;
    }
    const result = await FundInflowService.getInflowById(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Fund inflow fetched successfully",
        data: result,
    });
});

const deleteInflow = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Inflow ID must be a valid number",
        });
        return;
    }
    const result = await FundInflowService.deleteInflow(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Fund inflow deleted successfully",
        data: result,
    });
});

export const FundInflowController = {
    createInflow,
    getAllInflows,
    getInflowById,
    deleteInflow,
};
