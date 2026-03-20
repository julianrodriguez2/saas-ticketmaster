import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  exportAdminOrdersCsvHandler,
  getAdminOrderByIdHandler,
  listAdminOrdersHandler,
  listFlaggedAdminOrdersHandler,
  reviewAdminOrderHandler
} from "./adminOrders.controller";

const router = Router();

router.get("/", requireAdmin, listAdminOrdersHandler);
router.get("/flagged", requireAdmin, listFlaggedAdminOrdersHandler);
router.get("/export", requireAdmin, exportAdminOrdersCsvHandler);
router.post("/:id/review", requireAdmin, reviewAdminOrderHandler);
router.get("/:id", requireAdmin, getAdminOrderByIdHandler);

export default router;
