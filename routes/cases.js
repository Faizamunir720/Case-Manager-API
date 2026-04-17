"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const Case_1 = require("../models/Case");
const User_1 = require("../models/User");
const Hearing_1 = require("../models/Hearing");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const errors_1 = require("../lib/errors");
const router = (0, express_1.Router)();
const createCaseSchema = zod_1.z.object({
    caseNumber: zod_1.z.string().trim().min(1, "Case number is required"),
    title: zod_1.z.string().trim().min(1, "Title is required"),
    description: zod_1.z.string().trim().min(1, "Description is required"),
    applicant: zod_1.z.string().trim().min(1, "Applicant is required"),
    respondent: zod_1.z.string().trim().min(1, "Respondent is required"),
    caseType: zod_1.z.enum(["civil", "criminal", "commercial"], {
        errorMap: () => ({ message: "Case type must be civil, criminal, or commercial" }),
    }),
    filedDate: zod_1.z.coerce.date(),
    lawyerId: zod_1.z.string().refine((v) => mongoose_1.default.Types.ObjectId.isValid(v), {
        message: "Invalid lawyer ID",
    }),
});
const updateCaseSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).optional(),
    description: zod_1.z.string().trim().min(1).optional(),
    status: zod_1.z.enum(["Pending", "Ongoing", "Closed"]).optional(),
});
const listCasesQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["Pending", "Ongoing", "Closed"]).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
});
const assignCaseSchema = zod_1.z.object({
    judgeId: zod_1.z.string().refine((v) => mongoose_1.default.Types.ObjectId.isValid(v), {
        message: "Invalid judge ID",
    }),
});
router.post("/cases", auth_1.authenticate, (0, auth_1.authorize)("lawyer", "admin", "judge"), (0, validate_1.validate)(createCaseSchema), async (req, res) => {
    const body = req.body;
    const existing = await Case_1.Case.findOne({ caseNumber: body.caseNumber });
    if (existing) {
        res.status(409).json((0, errors_1.createError)("CASE_EXISTS", "Case number already exists"));
        return;
    }
    const lawyer = await User_1.User.findById(body.lawyerId);
    if (!lawyer || lawyer.role !== "lawyer") {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Lawyer not found"));
        return;
    }
    const newCase = await Case_1.Case.create({ ...body, status: "Pending" });
    res.status(201).json({
        success: true,
        data: {
            id: newCase._id,
            caseNumber: newCase.caseNumber,
            title: newCase.title,
            status: newCase.status,
            lawyerId: newCase.lawyerId,
            createdAt: newCase.createdAt,
        },
    });
});
router.get("/cases", auth_1.authenticate, (0, validate_1.validate)(listCasesQuerySchema, "query"), async (req, res) => {
    const { status, page, limit } = req.query;
    const filter = {};
    if (status)
        filter["status"] = status;
    const total = await Case_1.Case.countDocuments(filter);
    const cases = await Case_1.Case.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        data: cases.map((c) => ({
            id: c._id,
            caseNumber: c.caseNumber,
            title: c.title,
            status: c.status,
        })),
        pagination: { page, limit, total },
    });
});
router.get("/cases/:caseId", auth_1.authenticate, async (req, res) => {
    const { caseId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(caseId)) {
        res.status(400).json((0, errors_1.createError)("INVALID_ID", "Invalid case ID"));
        return;
    }
    const c = await Case_1.Case.findById(caseId);
    if (!c) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Case not found"));
        return;
    }
    res.status(200).json({
        success: true,
        data: {
            id: c._id,
            caseNumber: c.caseNumber,
            title: c.title,
            status: c.status,
            description: c.description,
            applicant: c.applicant,
            respondent: c.respondent,
            caseType: c.caseType,
            filedDate: c.filedDate,
            lawyerId: c.lawyerId,
            assignedJudgeId: c.assignedJudgeId ?? null,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        },
    });
});
router.put("/cases/:caseId", auth_1.authenticate, (0, auth_1.authorize)("lawyer", "admin"), (0, validate_1.validate)(updateCaseSchema), async (req, res) => {
    const { caseId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(caseId)) {
        res.status(400).json((0, errors_1.createError)("INVALID_ID", "Invalid case ID"));
        return;
    }
    const body = req.body;
    const c = await Case_1.Case.findById(caseId);
    if (!c) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Case not found"));
        return;
    }
    if (req.user?.role === "lawyer" &&
        c.lawyerId.toString() !== req.user.id) {
        res.status(403).json((0, errors_1.createError)("FORBIDDEN", "You can only update your own cases"));
        return;
    }
    const updated = await Case_1.Case.findByIdAndUpdate(caseId, body, { new: true });
    res.status(200).json({ success: true, data: updated });
});
router.post("/cases/:caseId/assign", auth_1.authenticate, (0, auth_1.authorize)("admin"), (0, validate_1.validate)(assignCaseSchema), async (req, res) => {
    const { caseId } = req.params;
    const { judgeId } = req.body;
    if (!mongoose_1.default.Types.ObjectId.isValid(caseId)) {
        res.status(400).json((0, errors_1.createError)("INVALID_ID", "Invalid case ID"));
        return;
    }
    const c = await Case_1.Case.findById(caseId);
    if (!c) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Case not found"));
        return;
    }
    const judge = await User_1.User.findById(judgeId);
    if (!judge || judge.role !== "judge") {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Judge not found"));
        return;
    }
    const updated = await Case_1.Case.findByIdAndUpdate(caseId, { assignedJudgeId: judgeId, status: "Ongoing" }, { new: true });
    res.status(200).json({
        success: true,
        data: {
            id: updated?._id,
            caseNumber: updated?.caseNumber,
            assignedJudgeId: updated?.assignedJudgeId,
            status: updated?.status,
        },
    });
});
router.get("/cases/:caseId/hearings", auth_1.authenticate, async (req, res) => {
    const { caseId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(caseId)) {
        res.status(400).json((0, errors_1.createError)("INVALID_ID", "Invalid case ID"));
        return;
    }
    const c = await Case_1.Case.findById(caseId);
    if (!c) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Case not found"));
        return;
    }
    const hearings = await Hearing_1.Hearing.find({ caseId }).sort({ hearingDate: 1 });
    res.status(200).json({
        success: true,
        data: hearings.map((h) => ({
            id: h._id,
            hearingDate: h.hearingDate,
            hearingTime: h.hearingTime,
            location: h.location,
            status: h.status,
            outcome: h.outcome ?? null,
        })),
    });
});
exports.default = router;
