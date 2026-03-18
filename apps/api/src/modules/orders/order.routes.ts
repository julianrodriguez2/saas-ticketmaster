import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { getOrderByIdHandler, listOrdersHandler } from "./order.controller";

const router = Router();

router.get("/", requireAuth, listOrdersHandler);
router.get("/:orderId", requireAuth, getOrderByIdHandler);

export default router;
