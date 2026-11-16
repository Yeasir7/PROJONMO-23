import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { UserService } from "./user.service.js";

const getMe = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getMe(req.user.userId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User fetched successfully",
        data: result,
    });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllUsers(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Users fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "User ID must be a valid number",
        });
        return;
    }
    const result = await UserService.getUserById(id, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User fetched successfully",
        data: result,
    });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "User ID must be a valid number",
        });
        return;
    }
    const result = await UserService.updateUserRole(id, req.body.role, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User role updated successfully",
        data: result,
    });
});

const updateFeeStatus = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "User ID must be a valid number",
        });
        return;
    }
    const result = await UserService.updateFeeStatus(id, req.body, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Fee status updated successfully",
        data: result,
    });
});

const updateKitStatus = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "User ID must be a valid number",
        });
        return;
    }
    const result = await UserService.updateKitStatus(id, req.body.kitDelivered);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Kit status updated successfully",
        data: result,
    });
});

const whitelistStudent = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.whitelistStudent(req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Student whitelisted successfully",
        data: result,
    });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.updateMyProfile(req.user.userId, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Profile updated successfully",
        data: result,
    });
});

export const UserController = {
    getMe,
    getAllUsers,
    getUserById,
    updateUserRole,
    updateFeeStatus,
    whitelistStudent,
    updateKitStatus,
    updateMyProfile,
};
