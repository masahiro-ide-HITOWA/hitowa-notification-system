import type { NotificationPayload } from "../models/notification";
export type NotificationPayloadValidationResult = {
    ok: true;
    payload: NotificationPayload;
} | {
    ok: false;
    errors: string[];
};
export declare function validateNotificationPayload(input: unknown): NotificationPayloadValidationResult;
