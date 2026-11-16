import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { SegmentService } from "./segment.service.js";

const createSegment = catchAsync(async (req: Request, res: Response) => {
    const result = await SegmentService.createSegment(req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Segment created successfully",
        data: result,
    });
});

const getAllSegments = catchAsync(async (req: Request, res: Response) => {
    const result = await SegmentService.getAllSegments(req.query as { category?: string });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Segments fetched successfully",
        data: result,
    });
});

const getSegmentById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Segment ID must be a valid number",
        });
        return;
    }
    const result = await SegmentService.getSegmentById(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Segment fetched successfully",
        data: result,
    });
});

const updateSegment = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Segment ID must be a valid number",
        });
        return;
    }
    const result = await SegmentService.updateSegment(id, req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Segment updated successfully",
        data: result,
    });
});

const deleteSegment = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Segment ID must be a valid number",
        });
        return;
    }
    const result = await SegmentService.deleteSegment(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Segment deleted successfully",
        data: result,
    });
});

const cancelMyRegistration = catchAsync(async (req: Request, res: Response) => {
    const segmentId = Number(req.params.id);
    if (Number.isNaN(segmentId)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Segment ID must be a valid number",
        });
        return;
    }

    const result = await SegmentService.cancelMyRegistration(segmentId, req.user!.userId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Registration cancelled successfully",
        data: result,
    });
});

const removeParticipant = catchAsync(async (req: Request, res: Response) => {
    const segmentId = Number(req.params.id);
    const registrationId = Number(req.params.registrationId);
    if (Number.isNaN(segmentId) || Number.isNaN(registrationId)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Segment ID and Registration ID must be valid numbers",
        });
        return;
    }

    const result = await SegmentService.removeParticipant(segmentId, registrationId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Participant removed successfully",
        data: result,
    });
});

export const SegmentController = {
    createSegment,
    getAllSegments,
    getSegmentById,
    updateSegment,
    deleteSegment,
    cancelMyRegistration,
    removeParticipant,
};
