"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const cases_1 = __importDefault(require("./cases"));
const hearings_1 = __importDefault(require("./hearings"));
const users_1 = __importDefault(require("./users"));
const router = (0, express_1.Router)();
router.use(auth_1.default);
router.use(cases_1.default);
router.use(hearings_1.default);
router.use(users_1.default);
exports.default = router;
