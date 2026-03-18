import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  createEventHandler,
  getEventByIdHandler,
  listEventsHandler
} from "./event.controller";

const router = Router();

router.get("/", listEventsHandler);
router.get("/:id", getEventByIdHandler);
router.post("/", requireAdmin, createEventHandler);

export default router;

