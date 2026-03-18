import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  createVenueHandler,
  listVenuesHandler
} from "./venue.controller";

const router = Router();

router.get("/", listVenuesHandler);
router.post("/", requireAdmin, createVenueHandler);

export default router;

