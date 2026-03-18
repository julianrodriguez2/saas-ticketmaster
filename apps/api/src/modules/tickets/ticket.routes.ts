import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import {
  checkInTicketHandler,
  getTicketByCodeHandler,
  getTicketByIdHandler,
  lookupTicketHandler
} from "./ticket.controller";

const router = Router();
const adminTicketRouter = Router();

router.get("/code/:code", requireAdmin, getTicketByCodeHandler);
router.get("/:id", requireAuth, getTicketByIdHandler);

adminTicketRouter.get("/lookup", requireAdmin, lookupTicketHandler);
adminTicketRouter.post("/:id/check-in", requireAdmin, checkInTicketHandler);

export { adminTicketRouter };
export default router;
