import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { SegmentRegistrationService } from "./segment-registration.service.js";

const registerForSegment = catchAsync(async (req: Request, res: Response) => {
    const result = await SegmentRegistrationService.registerForSegment(
        req.user.userId,
        req.body,
        req.user
    );

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Registered for segment successfully",
        data: result,
    });
});

const getMyRegistrations = catchAsync(async (req: Request, res: Response) => {
    const result = await SegmentRegistrationService.getMyRegistrations(
        req.user.userId
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "My registrations fetched successfully",
        data: result,
    });
});

const getAllRegistrations = catchAsync(async (req: Request, res: Response) => {
    const result = await SegmentRegistrationService.getAllRegistrations(
        req.query as { segmentId?: string; page?: string; limit?: string }
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Registrations fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

const updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await SegmentRegistrationService.updatePaymentStatus(
        Number(req.params.id),
        req.body.paymentStatus
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payment status updated successfully",
        data: result,
    });
});

const cancelRegistration = catchAsync(async (req: Request, res: Response) => {
    const result = await SegmentRegistrationService.cancelRegistration(
        Number(req.params.id),
        req.user
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Registration cancelled successfully",
        data: result,
    });
});

export const SegmentRegistrationController = {
    registerForSegment,
    getMyRegistrations,
    getAllRegistrations,
    updatePaymentStatus,
    cancelRegistration,
};
