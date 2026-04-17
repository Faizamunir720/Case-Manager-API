"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.createError = createError;
function createError(code, message, details) {
    return {
        success: false,
        error: {
            code,
            message,
            ...(details ? { details } : {}),
            timestamp: new Date().toISOString(),
        },
    };
}
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
