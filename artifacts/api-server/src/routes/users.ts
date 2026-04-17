import { Router, type IRouter } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { authenticate, authorize, type AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createError } from "../lib/errors";

const router: IRouter = Router();

const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

const listUsersQuerySchema = z.object({
  role: z.enum(["lawyer", "admin", "judge"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

router.get(
  "/users",
  authenticate,
  authorize("admin"),
  validate(listUsersQuerySchema, "query"),
  async (_req, res): Promise<void> => {
    const { role, page, limit } = _req.query as unknown as z.infer<
      typeof listUsersQuerySchema
    >;

    const filter: Record<string, unknown> = {};
    if (role) filter["role"] = role;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone ?? null,
        createdAt: u.createdAt,
      })),
      pagination: { page, limit, total },
    });
  },
);

router.get(
  "/users/:userId",
  authenticate,
  async (req: AuthRequest, res): Promise<void> => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      res.status(400).json(createError("INVALID_ID", "Invalid user ID"));
      return;
    }

    if (req.user?.role !== "admin" && req.user?.id !== userId) {
      res
        .status(403)
        .json(createError("FORBIDDEN", "You can only view your own profile"));
      return;
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(404).json(createError("NOT_FOUND", "User not found"));
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone ?? null,
        createdAt: user.createdAt,
      },
    });
  },
);

router.put(
  "/users/:userId",
  authenticate,
  validate(updateUserSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const { userId } = req.params;
    const body = req.body as z.infer<typeof updateUserSchema>;

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      res.status(400).json(createError("INVALID_ID", "Invalid user ID"));
      return;
    }

    if (req.user?.role !== "admin" && req.user?.id !== userId) {
      res
        .status(403)
        .json(createError("FORBIDDEN", "You can only update your own profile"));
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json(createError("NOT_FOUND", "User not found"));
      return;
    }

    if (body.name !== undefined) user.name = body.name;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.password !== undefined) {
      user.password = await bcrypt.hash(body.password, 12);
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone ?? null,
        updatedAt: user.updatedAt,
      },
    });
  },
);

export default router;
