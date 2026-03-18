import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  exportEventAttendeesCsvHandler,
  listEventAttendeesHandler
} from "./adminAttendees.controller";

const router = Router();

router.get("/events/:eventId/attendees", requireAdmin, listEventAttendeesHandler);
router.get(
  "/events/:eventId/attendees/export",
  requireAdmin,
  exportEventAttendeesCsvHandler
);

export default router;
