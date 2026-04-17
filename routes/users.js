"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const errors_1 = require("../lib/errors");
const router = (0, express_1.Router)();
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).optional(),
    phone: zod_1.z.string().trim().optional(),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters").optional(),
});
const listUsersQuerySchema = zod_1.z.object({
    role: zod_1.z.enum(["lawyer", "admin", "judge"]).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
});
router.get("/users", auth_1.authenticate, (0, auth_1.authorize)("admin"), (0, validate_1.validate)(listUsersQuerySchema, "query"), async (_req, res) => {
    const { role, page, limit } = _req.query;
    const filter = {};
    if (role)
        filter["role"] = role;
    const total = await User_1.User.countDocuments(filter);
    const users = await User_1.User.find(filter)
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
});
router.get("/users/:userId", auth_1.authenticate, async (req, res) => {
    const { userId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        res.status(400).json((0, errors_1.createError)("INVALID_ID", "Invalid user ID"));
        return;
    }
    if (req.user?.role !== "admin" && req.user?.id !== userId) {
        res
            .status(403)
            .json((0, errors_1.createError)("FORBIDDEN", "You can only view your own profile"));
        return;
    }
    const user = await User_1.User.findById(userId).select("-password");
    if (!user) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "User not found"));
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
});
router.put("/users/:userId", auth_1.authenticate, (0, validate_1.validate)(updateUserSchema), async (req, res) => {
    const { userId } = req.params;
    const body = req.body;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        res.status(400).json((0, errors_1.createError)("INVALID_ID", "Invalid user ID"));
        return;
    }
    if (req.user?.role !== "admin" && req.user?.id !== userId) {
        res
            .status(403)
            .json((0, errors_1.createError)("FORBIDDEN", "You can only update your own profile"));
        return;
    }
    const user = await User_1.User.findById(userId);
    if (!user) {
        res.status(404).json((0, errors_1.createError)("NOT_FOUND", "User not found"));
        return;
    }
    if (body.name !== undefined)
        user.name = body.name;
    if (body.phone !== undefined)
        user.phone = body.phone;
    if (body.password !== undefined) {
        user.password = await bcryptjs_1.default.hash(body.password, 12);
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
});
exports.default = router;
