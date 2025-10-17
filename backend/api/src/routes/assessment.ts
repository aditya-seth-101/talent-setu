import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.js";
import { requireRoles } from "../middleware/rbac.js";
import {
  createAssessmentHandler,
  createAssessmentTemplateHandler,
  getAssessmentHandler,
  getAssessmentTemplateHandler,
  listAssessmentTemplatesHandler,
  publishAssessmentTemplateHandler,
  recordVoiceTranscriptHandler,
  startAssessmentHandler,
  submitCodingAttemptHandler,
} from "../controllers/assessment.controller.js";

export const assessmentRouter = Router();

assessmentRouter.use(authenticate);

assessmentRouter.get("/templates", listAssessmentTemplatesHandler);
assessmentRouter.post(
  "/templates",
  requireRoles(["recruiter", "admin"]),
  createAssessmentTemplateHandler
);
assessmentRouter.get("/templates/:templateId", getAssessmentTemplateHandler);
assessmentRouter.post(
  "/templates/:templateId/publish",
  requireRoles(["admin"]),
  publishAssessmentTemplateHandler
);

assessmentRouter.post(
  "/",
  requireRoles(["recruiter", "admin"]),
  createAssessmentHandler
);
assessmentRouter.get("/:assessmentId", getAssessmentHandler);
assessmentRouter.post("/:assessmentId/start", startAssessmentHandler);
assessmentRouter.post(
  "/:assessmentId/phases/:phaseId/transcripts",
  recordVoiceTranscriptHandler
);
assessmentRouter.post(
  "/:assessmentId/phases/:phaseId/coding",
  submitCodingAttemptHandler
);
