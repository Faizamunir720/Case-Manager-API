import { Router, type IRouter } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Hearing } from "../models/Hearing";
import { Case } from "../models/Case";
import { User } from "../models/User";
import { authenticate, authorize, type AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createError } from "../lib/errors";

const router: IRouter = Router();

const createHearingSchema = z.object({
  caseId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), {
    message: "Invalid case ID",
  }),
  hearingDate: z.coerce.date(),
  hearingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hearing time must be in HH:MM format"),
  location: z.string().trim().min(1, "Location is required"),
  description: z.string().trim().optional(),
  judgeId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), {
    message: "Invalid judge ID",
  }),
});

const updateOutcomeSchema = z.object({
  status: z.enum(["Completed", "Adjourned", "Postponed"], {
    errorMap: () => ({
      message: "Status must be Completed, Adjourned, or Postponed",
    }),
  }),
  outcome: z.string().trim().min(1, "Outcome is required"),
  notes: z.string().trim().optional(),
});

router.post(
  "/hearings",
  authenticate,
  authorize("admin", "judge"),
  validate(createHearingSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const body = req.body as z.infer<typeof createHearingSchema>;

    const c = await Case.findById(body.caseId);
    if (!c) {
      res.status(404).json(createError("NOT_FOUND", "Case not found"));
      return;
    }

    const judge = await User.findById(body.judgeId);
    if (!judge || judge.role !== "judge") {
      res.status(404).json(createError("NOT_FOUND", "Judge not found"));
      return;
    }

    const conflict = await Hearing.findOne({
      judgeId: body.judgeId,
      hearingDate: body.hearingDate,
      hearingTime: body.hearingTime,
      status: "Scheduled",
    });

    if (conflict) {
      res
        .status(409)
        .json(
          createError(
            "JUDGE_UNAVAILABLE",
            "Judge already has a hearing scheduled at this date and time",
          ),
        );
      return;
    }

    const hearing = await Hearing.create({ ...body, status: "Scheduled" });

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
  },
);

router.get(
  "/hearings/:hearingId",
  authenticate,
  async (req: AuthRequest, res): Promise<void> => {
    const { hearingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(hearingId as string)) {
      res.status(400).json(createError("INVALID_ID", "Invalid hearing ID"));
      return;
    }

    const hearing = await Hearing.findById(hearingId);
    if (!hearing) {
      res.status(404).json(createError("NOT_FOUND", "Hearing not found"));
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
  },
);

router.put(
  "/hearings/:hearingId/outcome",
  authenticate,
  authorize("judge"),
  validate(updateOutcomeSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const { hearingId } = req.params;
    const body = req.body as z.infer<typeof updateOutcomeSchema>;

    if (!mongoose.Types.ObjectId.isValid(hearingId as string)) {
      res.status(400).json(createError("INVALID_ID", "Invalid hearing ID"));
      return;
    }

    const hearing = await Hearing.findById(hearingId);
    if (!hearing) {
      res.status(404).json(createError("NOT_FOUND", "Hearing not found"));
      return;
    }

    if (hearing.judgeId.toString() !== req.user?.id) {
      res
        .status(403)
        .json(
          createError("FORBIDDEN", "Only the assigned judge can update this hearing"),
        );
      return;
    }

    const updated = await Hearing.findByIdAndUpdate(hearingId, body, {
      new: true,
    });

    if (body.status === "Completed") {
      await Case.findByIdAndUpdate(hearing.caseId, { status: "Closed" });
    }

    res.status(200).json({ success: true, data: updated });
  },
);

export default router;
