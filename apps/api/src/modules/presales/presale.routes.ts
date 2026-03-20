import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  createPresaleRuleHandler,
  deletePresaleRuleHandler,
  listPresaleRulesHandler,
  updatePresaleRuleHandler,
  validatePresaleAccessHandler
} from "./presale.controller";

const router = Router();

router.post("/events/:eventId/presale/validate", validatePresaleAccessHandler);

router.get("/admin/events/:eventId/presales", requireAdmin, listPresaleRulesHandler);
router.post("/admin/events/:eventId/presales", requireAdmin, createPresaleRuleHandler);
router.put("/admin/presales/:id", requireAdmin, updatePresaleRuleHandler);
router.delete("/admin/presales/:id", requireAdmin, deletePresaleRuleHandler);

export default router;
