"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../lib/errors");
const logger_1 = require("../lib/logger");
function errorHandler(err, req, res, _next) {
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json((0, errors_1.createError)(err.code, err.message, err.details));
        return;
    }
    logger_1.logger.error({ err, method: req.method, url: req.url }, "Unhandled error");
    res.status(500).json((0, errors_1.createError)("SERVER_ERROR", "An unexpected error occurred"));
}
