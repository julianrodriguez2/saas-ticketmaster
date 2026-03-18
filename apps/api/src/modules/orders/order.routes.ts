import { Router } from "express";
import { optionalAuth } from "../../middlewares/auth";
import { getOrderByIdHandler } from "./order.controller";

const router = Router();

router.get("/:orderId", optionalAuth, getOrderByIdHandler);

export default router;
