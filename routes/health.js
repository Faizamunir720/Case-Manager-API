"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_zod_1 = require("@workspace/api-zod");
const router = (0, express_1.Router)();
router.get("/healthz", (_req, res) => {
    const data = api_zod_1.HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
});
exports.default = router;
