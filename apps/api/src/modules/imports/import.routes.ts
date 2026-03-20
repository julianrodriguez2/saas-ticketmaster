import multer from "multer";
import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth";
import {
  commitEventImportHandler,
  getImportJobByIdHandler,
  listImportJobsHandler,
  validateEventImportHandler
} from "./import.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.post(
  "/events/validate",
  requireAdmin,
  upload.single("file"),
  validateEventImportHandler
);
router.post("/events/commit", requireAdmin, commitEventImportHandler);
router.get("/", requireAdmin, listImportJobsHandler);
router.get("/:id", requireAdmin, getImportJobByIdHandler);

export default router;
