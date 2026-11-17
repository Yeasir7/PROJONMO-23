import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { CashHandoverService } from "./cash-handover.service.js";

const createHandover = catchAsync(async (req: Request, res: Response) => {
    const result = await CashHandoverService.createHandover(req.user, req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Cash handover created successfully",
        data: result,
    });
});

const getAllHandovers = catchAsync(async (req: Request, res: Response) => {
    const result = await CashHandoverService.getAllHandovers(
        req.user,
        req.query as { sectionId?: string; status?: string; page?: string; limit?: string }
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Cash handovers fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getHandoverById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Handover ID must be a valid number",
        });
        return;
    }
    const result = await CashHandoverService.getHandoverById(id, req.user);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Cash handover fetched successfully",
        data: result,
    });
});

const verifyHandover = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Handover ID must be a valid number",
        });
        return;
    }
    const result = await CashHandoverService.verifyHandover(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Cash handover verified successfully",
        data: result,
    });
});

const deleteHandover = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Handover ID must be a valid number",
        });
        return;
    }
    const result = await CashHandoverService.deleteHandover(id, req.user);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Cash handover rejected and deleted successfully",
        data: result,
    });
});

export const CashHandoverController = {
    createHandover,
    getAllHandovers,
    getHandoverById,
    verifyHandover,
    deleteHandover,
};
