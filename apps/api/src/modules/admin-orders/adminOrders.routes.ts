import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  getAdminOrderByIdHandler,
  listAdminOrdersHandler
} from "./adminOrders.controller";

const router = Router();

router.get("/", requireAdmin, listAdminOrdersHandler);
router.get("/:id", requireAdmin, getAdminOrderByIdHandler);

export default router;
