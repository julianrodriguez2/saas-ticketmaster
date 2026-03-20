import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  exportAdminOrdersCsvHandler,
  getAdminOrderByIdHandler,
  listAdminOrdersHandler
} from "./adminOrders.controller";

const router = Router();

router.get("/", requireAdmin, listAdminOrdersHandler);
router.get("/export", requireAdmin, exportAdminOrdersCsvHandler);
router.get("/:id", requireAdmin, getAdminOrderByIdHandler);

export default router;
