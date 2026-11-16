import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { CommitteeService } from "./committee.service.js";

const createCommittee = catchAsync(async (req: Request, res: Response) => {
    const result = await CommitteeService.createCommittee(req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Committee created successfully",
        data: result,
    });
});

const getAllCommittees = catchAsync(async (req: Request, res: Response) => {
    const result = await CommitteeService.getAllCommittees();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Committees fetched successfully",
        data: result,
    });
});

const getCommitteeById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Committee ID must be a valid number",
        });
        return;
    }
    const result = await CommitteeService.getCommitteeById(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Committee fetched successfully",
        data: result,
    });
});

const updateCommittee = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Committee ID must be a valid number",
        });
        return;
    }
    const result = await CommitteeService.updateCommittee(id, req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Committee updated successfully",
        data: result,
    });
});

const deleteCommittee = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Committee ID must be a valid number",
        });
        return;
    }
    const result = await CommitteeService.deleteCommittee(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Committee deleted successfully",
        data: result,
    });
});

const addMember = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Committee ID must be a valid number",
        });
        return;
    }
    const result = await CommitteeService.addMember(id, req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Member added to committee successfully",
        data: result,
    });
});

const updateMemberDesignation = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = Number(req.params.userId);
    if (Number.isNaN(id) || Number.isNaN(userId)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Committee ID and User ID must be valid numbers",
        });
        return;
    }
    const result = await CommitteeService.updateMemberDesignation(id, userId, req.body.designation);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Committee member designation updated successfully",
        data: result,
    });
});

const removeMember = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = Number(req.params.userId);
    if (Number.isNaN(id) || Number.isNaN(userId)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Committee ID and User ID must be valid numbers",
        });
        return;
    }
    const result = await CommitteeService.removeMember(id, userId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Member removed from committee successfully",
        data: result,
    });
});

export const CommitteeController = {
    createCommittee,
    getAllCommittees,
    getCommitteeById,
    updateCommittee,
    deleteCommittee,
    addMember,
    updateMemberDesignation,
    removeMember,
};
