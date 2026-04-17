"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const Hearing_1 = require("../models/Hearing");
const Case_1 = require("../models/Case");
const User_1 = require("../models/User");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const errors_1 = require("../lib/errors");
const router = (0, express_1.Router)();
const createHearingSchema = zod_1.z.object({
    caseId: zod_1.z.string().refine((v) => mongoose_1.default.Types.ObjectId.isValid(v), {
        message: "Invalid case ID",
    }),
    hearingDate: zod_1.z.coerce.date(),
    hearingTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Hearing time must be in HH:MM format"),
    location: zod_1.z.string().trim().min(1, "Location is required"),
    description: zod_1.z.string().trim().optional(),
    judgeId: zod_1.z.string().refine((v) => mongoose_1.default.Types.ObjectId.isValid(v), {
        message: "Invalid judge ID",
    }),
});
const updateOutcomeSchema = zod_1.z.object({
    status: zod_1.z.enum(["Completed", "Adjourned", "Postponed"], {
        errorMap: () => ({
            message: "Status must be Completed, Adjourned, or Postponed",
        }),
    }),
    outcome: zod_1.z.string().trim().min(1, "Outcome is required"),
    notes: zod_1.z.string().trim().optional(),
});
router.post("/hearings", auth_1.authenticate, (0, auth_1.authorize)("admin", "judge"), (0, validate_1.validate)(createHearingSchema), async (req, res) => {
    const body = req.body;
    const c = await Case_1.Case.findById(body.caseId);
    if (!c) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Case not found"));
        return;
    }
    const judge = await User_1.User.findById(body.judgeId);
    if (!judge || judge.role !== "judge") {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Judge not found"));
        return;
    }
    const conflict = await Hearing_1.Hearing.findOne({
        judgeId: body.judgeId,
        hearingDate: body.hearingDate,
        hearingTime: body.hearingTime,
        status: "Scheduled",
    });
    if (conflict) {
        res
            .status(409)
            .json((0, errors_1.createError)("JUDGE_UNAVAILABLE", "Judge already has a hearing scheduled at this date and time"));
        return;
    }
    const hearing = await Hearing_1.Hearing.create({ ...body, status: "Scheduled" });
    res.status(201).json({
        success: true,
        data: {
            id: hearing._id,
            caseId: hearing.caseId,
            hearingDate: hearing.hearingDate,
            hearingTime: hearing.hearingTime,
            location: hearing.location,
            judgeId: hearing.judgeId,
            status: hearing.status,
            createdAt: hearing.createdAt,
        },
    });
});
router.get("/hearings/:hearingId", auth_1.authenticate, async (req, res) => {
    const { hearingId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(hearingId)) {
        res.status(400).json((0, errors_1.createError)("INVALID_ID", "Invalid hearing ID"));
        return;
    }
    const hearing = await Hearing_1.Hearing.findById(hearingId);
    if (!hearing) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Hearing not found"));
        return;
    }
    res.status(200).json({
        success: true,
        data: {
            id: hearing._id,
            caseId: hearing.caseId,
            hearingDate: hearing.hearingDate,
            hearingTime: hearing.hearingTime,
            location: hearing.location,
            judgeId: hearing.judgeId,
            status: hearing.status,
            outcome: hearing.outcome ?? null,
            notes: hearing.notes ?? null,
            createdAt: hearing.createdAt,
        },
    });
});
router.put("/hearings/:hearingId/outcome", auth_1.authenticate, (0, auth_1.authorize)("judge"), (0, validate_1.validate)(updateOutcomeSchema), async (req, res) => {
    const { hearingId } = req.params;
    const body = req.body;
    if (!mongoose_1.default.Types.ObjectId.isValid(hearingId)) {
        res.status(400).json((0, errors_1.createError)("INVALID_ID", "Invalid hearing ID"));
        return;
    }
    const hearing = await Hearing_1.Hearing.findById(hearingId);
    if (!hearing) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "Hearing not found"));
        return;
    }
    if (hearing.judgeId.toString() !== req.user?.id) {
        res
            .status(403)
            .json((0, errors_1.createError)("FORBIDDEN", "Only the assigned judge can update this hearing"));
        return;
    }
    const updated = await Hearing_1.Hearing.findByIdAndUpdate(hearingId, body, {
        new: true,
    });
    if (body.status === "Completed") {
        await Case_1.Case.findByIdAndUpdate(hearing.caseId, { status: "Closed" });
    }
    res.status(200).json({ success: true, data: updated });
});
exports.default = router;
