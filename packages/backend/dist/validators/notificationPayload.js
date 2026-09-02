"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNotificationPayload = validateNotificationPayload;
const SOURCE_SYSTEMS = [
    "kaonavi",
    "tokium",
    "cloudhouse_labor",
];
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
function isSourceSystem(value) {
    return (typeof value === "string" &&
        SOURCE_SYSTEMS.includes(value));
}
function validateNotificationPayload(input) {
    if (typeof input !== "object" || input === null) {
        return { ok: false, errors: ["Request body must be a JSON object"] };
    }
    const body = input;
    const errors = [];
    if (!isNonEmptyString(body.target_employee_id)) {
        errors.push("target_employee_id is required and must be a non-empty string");
    }
    if (!isSourceSystem(body.source_system)) {
        errors.push(`source_system must be one of: ${SOURCE_SYSTEMS.join(", ")}`);
    }
    if (!isNonEmptyString(body.title)) {
        errors.push("title is required and must be a non-empty string");
    }
    if (!isNonEmptyString(body.body)) {
        errors.push("body is required and must be a non-empty string");
    }
    if (!isNonEmptyString(body.action_url)) {
        errors.push("action_url is required and must be a non-empty string");
    }
    if (!isNonEmptyString(body.category)) {
        errors.push("category is required and must be a non-empty string");
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return {
        ok: true,
        payload: {
            target_employee_id: body.target_employee_id,
            source_system: body.source_system,
            title: body.title,
            body: body.body,
            action_url: body.action_url,
            category: body.category,
        },
    };
}
