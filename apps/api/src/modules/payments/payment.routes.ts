import { raw, Router } from "express";
import { stripeWebhookHandler } from "./payment.controller";

const router = Router();

router.post("/stripe", raw({ type: "application/json" }), stripeWebhookHandler);

export default router;
