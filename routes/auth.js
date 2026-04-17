"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const User_1 = require("../models/User");
const jwt_1 = require("../lib/jwt");
const errors_1 = require("../lib/errors");
const validate_1 = require("../middlewares/validate");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, "Name is required"),
    email: zod_1.z.string().trim().email("Invalid email format"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    role: zod_1.z.enum(["lawyer", "admin", "judge"], {
        errorMap: () => ({ message: "Role must be one of: lawyer, admin, judge" }),
    }),
    phone: zod_1.z.string().trim().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email("Invalid email format"),
    password: zod_1.z.string().min(1, "Password is required"),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, "Refresh token is required"),
});
router.post("/auth/register", (0, validate_1.validate)(registerSchema), async (req, res) => {
    const { name, email, password, role, phone } = req.body;
    const existing = await User_1.User.findOne({ email });
    if (existing) {
        res.status(409).json((0, errors_1.createError)("EMAIL_EXISTS", "Email is already registered"));
        return;
    }
    const user = await User_1.User.create({ name, email, password, role, phone });
    res.status(201).json({
        success: true,
        data: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        },
    });
});
router.post("/auth/login", (0, validate_1.validate)(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const user = await User_1.User.findOne({ email });
    if (!user) {
        res.status(401).json((0, errors_1.createError)("INVALID_CREDENTIALS", "Invalid email or password"));
        return;
    }
    const isValid = await user.comparePassword(password);
    if (!isValid) {
        res.status(401).json((0, errors_1.createError)("INVALID_CREDENTIALS", "Invalid email or password"));
        return;
    }
    const tokenPayload = {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
    };
    const token = (0, jwt_1.signAccessToken)(tokenPayload);
    const refreshToken = (0, jwt_1.signRefreshToken)({ id: user._id.toString() });
    res.status(200).json({
        success: true,
        data: {
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        },
    });
});
router.post("/auth/refresh", auth_1.authenticate, (0, validate_1.validate)(refreshSchema), async (req, res) => {
    const { refreshToken } = req.body;
    try {
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        const user = await User_1.User.findById(decoded.id);
        if (!user) {
            res.status(401).json((0, errors_1.createError)("INVALID_TOKEN", "User not found"));
            return;
        }
        const newToken = (0, jwt_1.signAccessToken)({
            id: user._id.toString(),
            role: user.role,
            email: user.email,
            name: user.name,
        });
        res.status(200).json({ success: true, data: { token: newToken } });
    }
    catch {
        res.status(401).json((0, errors_1.createError)("INVALID_TOKEN", "Invalid or expired refresh token"));
    }
});
exports.default = router;
