import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { SectionService } from "./section.service.js";

const createSection = catchAsync(async (req: Request, res: Response) => {
    const result = await SectionService.createSection(req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Section created successfully",
        data: result,
    });
});

const getAllSections = catchAsync(async (req: Request, res: Response) => {
    const result = await SectionService.getAllSections();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Sections fetched successfully",
        data: result,
    });
});

const getSectionById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Section ID must be a valid number",
        });
        return;
    }
    const result = await SectionService.getSectionById(id, req.user);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Section fetched successfully",
        data: result,
    });
});

const updateSection = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Section ID must be a valid number",
        });
        return;
    }
    const result = await SectionService.updateSection(id, req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Section updated successfully",
        data: result,
    });
});

const deleteSection = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Section ID must be a valid number",
        });
        return;
    }
    const result = await SectionService.deleteSection(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Section deleted successfully",
        data: result,
    });
});

const updateSemesterFee = catchAsync(async (req: Request, res: Response) => {
    const result = await SectionService.updateSemesterFee(req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: `Updated fest fee for semester ${req.body.semester} to ${req.body.festFee} BDT`,
        data: result,
    });
});

export const SectionController = {
    createSection,
    getAllSections,
    getSectionById,
    updateSection,
    updateSemesterFee,
    deleteSection,
};
