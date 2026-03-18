import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { getTicketByCodeHandler, getTicketByIdHandler } from "./ticket.controller";

const router = Router();

router.get("/code/:code", requireAdmin, getTicketByCodeHandler);
router.get("/:id", requireAuth, getTicketByIdHandler);

export default router;
