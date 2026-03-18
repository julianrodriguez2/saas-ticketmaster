import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  getAdminSeatMapHandler,
  getEventAvailabilityHandler,
  getPublicSeatMapHandler,
  replaceSeatMapHandler,
  validateSelectionHandler
} from "./seatmap.controller";

const router = Router();

router.get("/events/:eventId/seat-map", getPublicSeatMapHandler);
router.get("/events/:eventId/availability", getEventAvailabilityHandler);
router.post("/events/:eventId/validate-selection", validateSelectionHandler);

router.get("/admin/events/:eventId/seat-map", requireAdmin, getAdminSeatMapHandler);
router.post("/admin/events/:eventId/seat-map", requireAdmin, replaceSeatMapHandler);

export default router;