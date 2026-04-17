"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const MONGODB_URI = process.env["MONGODB_URI"];
if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required");
}
async function connectDB() {
    try {
        await mongoose_1.default.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        logger_1.logger.info("Connected to MongoDB");
    }
    catch (err) {
        logger_1.logger.error({ err }, "Failed to connect to MongoDB — check Atlas IP whitelist (allow 0.0.0.0/0)");
        throw err;
    }
}
exports.default = mongoose_1.default;
