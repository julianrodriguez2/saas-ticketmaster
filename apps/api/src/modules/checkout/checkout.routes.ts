import { Router } from "express";
import { optionalAuth } from "../../middlewares/auth";
import { createCheckoutSessionHandler } from "./checkout.controller";

const router = Router();

router.post("/create-session", optionalAuth, createCheckoutSessionHandler);

export default router;
