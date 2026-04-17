import { Router, type IRouter } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Case } from "../models/Case";
import { User } from "../models/User";
import { Hearing } from "../models/Hearing";
import { authenticate, authorize, type AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createError } from "../lib/errors";

const router: IRouter = Router();

const createCaseSchema = z.object({
  caseNumber: z.string().trim().min(1, "Case number is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  applicant: z.string().trim().min(1, "Applicant is required"),
  respondent: z.string().trim().min(1, "Respondent is required"),
  caseType: z.enum(["civil", "criminal", "commercial"], {
    errorMap: () => ({ message: "Case type must be civil, criminal, or commercial" }),
  }),
  filedDate: z.coerce.date(),
  lawyerId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), {
    message: "Invalid lawyer ID",
  }),
});

const updateCaseSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  status: z.enum(["Pending", "Ongoing", "Closed"]).optional(),
});

const listCasesQuerySchema = z.object({
  status: z.enum(["Pending", "Ongoing", "Closed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const assignCaseSchema = z.object({
  judgeId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), {
    message: "Invalid judge ID",
  }),
});

router.post(
  "/cases",
  authenticate,
  authorize("lawyer", "admin", "judge"),
  validate(createCaseSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const body = req.body as z.infer<typeof createCaseSchema>;

    const existing = await Case.findOne({ caseNumber: body.caseNumber });
    if (existing) {
      res.status(409).json(createError("CASE_EXISTS", "Case number already exists"));
      return;
    }

    const lawyer = await User.findById(body.lawyerId);
    if (!lawyer || lawyer.role !== "lawyer") {
      res.status(404).json(createError("NOT_FOUND", "Lawyer not found"));
      return;
    }

    const newCase = await Case.create({ ...body, status: "Pending" });

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
  },
);

router.get(
  "/cases",
  authenticate,
  validate(listCasesQuerySchema, "query"),
  async (req: AuthRequest, res): Promise<void> => {
    const { status, page, limit } = req.query as unknown as z.infer<typeof listCasesQuerySchema>;

    const filter: Record<string, unknown> = {};
    if (status) filter["status"] = status;

    const total = await Case.countDocuments(filter);
    const cases = await Case.find(filter)
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
  },
);

router.get(
  "/cases/:caseId",
  authenticate,
  async (req: AuthRequest, res): Promise<void> => {
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId as string)) {
      res.status(400).json(createError("INVALID_ID", "Invalid case ID"));
      return;
    }

    const c = await Case.findById(caseId);
    if (!c) {
      res.status(404).json(createError("NOT_FOUND", "Case not found"));
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
  },
);

router.put(
  "/cases/:caseId",
  authenticate,
  authorize("lawyer", "admin"),
  validate(updateCaseSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId as string)) {
      res.status(400).json(createError("INVALID_ID", "Invalid case ID"));
      return;
    }

    const body = req.body as z.infer<typeof updateCaseSchema>;

    const c = await Case.findById(caseId);
    if (!c) {
      res.status(404).json(createError("NOT_FOUND", "Case not found"));
      return;
    }

    if (
      req.user?.role === "lawyer" &&
      c.lawyerId.toString() !== req.user.id
    ) {
      res.status(403).json(createError("FORBIDDEN", "You can only update your own cases"));
      return;
    }

    const updated = await Case.findByIdAndUpdate(caseId, body, { new: true });

    res.status(200).json({ success: true, data: updated });
  },
);

router.post(
  "/cases/:caseId/assign",
  authenticate,
  authorize("admin"),
  validate(assignCaseSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const { caseId } = req.params;
    const { judgeId } = req.body as z.infer<typeof assignCaseSchema>;

    if (!mongoose.Types.ObjectId.isValid(caseId as string)) {
      res.status(400).json(createError("INVALID_ID", "Invalid case ID"));
      return;
    }

    const c = await Case.findById(caseId);
    if (!c) {
      res.status(404).json(createError("NOT_FOUND", "Case not found"));
      return;
    }

    const judge = await User.findById(judgeId);
    if (!judge || judge.role !== "judge") {
      res.status(404).json(createError("NOT_FOUND", "Judge not found"));
      return;
    }

    const updated = await Case.findByIdAndUpdate(
      caseId,
      { assignedJudgeId: judgeId, status: "Ongoing" },
      { new: true },
    );

    res.status(200).json({
      success: true,
      data: {
        id: updated?._id,
        caseNumber: updated?.caseNumber,
        assignedJudgeId: updated?.assignedJudgeId,
        status: updated?.status,
      },
    });
  },
);

router.get(
  "/cases/:caseId/hearings",
  authenticate,
  async (req: AuthRequest, res): Promise<void> => {
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId as string)) {
      res.status(400).json(createError("INVALID_ID", "Invalid case ID"));
      return;
    }

    const c = await Case.findById(caseId);
    if (!c) {
      res.status(404).json(createError("NOT_FOUND", "Case not found"));
      return;
    }

    const hearings = await Hearing.find({ caseId }).sort({ hearingDate: 1 });

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
  },
);

export default router;
