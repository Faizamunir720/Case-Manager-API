"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const errors_1 = require("../lib/errors");
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json((0, errors_1.createError)("MISSING_TOKEN", "Authentication token is required"));
        return;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        res.status(401).json((0, errors_1.createError)("MISSING_TOKEN", "Authentication token is required"));
        return;
    }
    const JWT_SECRET = process.env["JWT_SECRET"];
    if (!JWT_SECRET) {
        res.status(500).json((0, errors_1.createError)("SERVER_ERROR", "Server configuration error"));
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await User_1.User.findById(decoded.id).select("-password");
        if (!user) {
            res.status(401).json((0, errors_1.createError)("INVALID_TOKEN", "User no longer exists"));
            return;
        }
        req.user = {
            id: user._id.toString(),
            role: user.role,
            email: user.email,
            name: user.name,
        };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json((0, errors_1.createError)("TOKEN_EXPIRED", "Token has expired"));
            return;
        }
        res.status(401).json((0, errors_1.createError)("INVALID_TOKEN", "Invalid or malformed token"));
    }
}
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json((0, errors_1.createError)("MISSING_TOKEN", "Authentication required"));
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json((0, errors_1.createError)("FORBIDDEN", `Access denied. Required role(s): ${roles.join(", ")}`));
            return;
        }
        next();
    };
}
