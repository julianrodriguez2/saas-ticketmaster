import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  listAdminNotificationsHandler,
  markAdminNotificationReadHandler,
  markAllAdminNotificationsReadHandler
} from "./adminNotification.controller";

const router = Router();

router.get("/", requireAdmin, listAdminNotificationsHandler);
router.post("/read-all", requireAdmin, markAllAdminNotificationsReadHandler);
router.post("/:id/read", requireAdmin, markAdminNotificationReadHandler);

export default router;
