import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  applyTemplateToEventHandler,
  createEventTemplateHandler,
  deleteEventTemplateHandler,
  getEventTemplateByIdHandler,
  listEventTemplatesHandler,
  updateEventTemplateHandler
} from "./eventTemplate.controller";

const router = Router();

router.get("/", requireAdmin, listEventTemplatesHandler);
router.post("/", requireAdmin, createEventTemplateHandler);
router.get("/:id", requireAdmin, getEventTemplateByIdHandler);
router.put("/:id", requireAdmin, updateEventTemplateHandler);
router.delete("/:id", requireAdmin, deleteEventTemplateHandler);
router.post("/:id/apply", requireAdmin, applyTemplateToEventHandler);

export default router;
