import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  getAdminAnalyticsOverviewHandler,
  getEventAnalyticsDetailHandler,
  getSalesVelocityHandler,
  listEventPerformanceHandler
} from "./adminAnalytics.controller";

const router = Router();

router.get("/overview", requireAdmin, getAdminAnalyticsOverviewHandler);
router.get("/events", requireAdmin, listEventPerformanceHandler);
router.get("/events/:eventId", requireAdmin, getEventAnalyticsDetailHandler);
router.get("/sales-velocity", requireAdmin, getSalesVelocityHandler);

export default router;
