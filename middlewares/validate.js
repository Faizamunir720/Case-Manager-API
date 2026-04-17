"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const errors_1 = require("../lib/errors");
function validate(schema, source = "body") {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            const details = result.error.flatten();
            res.status(400).json((0, errors_1.createError)("VALIDATION_ERROR", "Invalid request data", details));
            return;
        }
        req[source] = result.data;
        next();
    };
}
