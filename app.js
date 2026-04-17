"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pino_http_1 = __importDefault(require("pino-http"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./lib/logger");
const errorHandler_1 = require("./middlewares/errorHandler");
const errors_1 = require("./lib/errors");
const app = (0, express_1.default)();
app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url?.split("?")[0],
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
}));
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json({
    limit: "10mb",
    strict: true,
}));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    keyGenerator: (req) => {
        const authReq = req;
        return authReq.user?.id ?? req.ip ?? "unknown";
    },
    handler: (_req, res) => {
        res.status(429).json((0, errors_1.createError)("RATE_LIMIT_EXCEEDED", "Too many requests, please try again later"));
    },
});
app.use(limiter);
app.use("/api", routes_1.default);
app.use(errorHandler_1.errorHandler);
exports.default = app;
