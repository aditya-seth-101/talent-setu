import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.js";
import { requireRoles } from "../middleware/rbac.js";
import {
  getTalentProfileHandler,
  searchTalentHandler,
} from "../controllers/recruitment.controller.js";

export const recruitmentRouter = Router();

recruitmentRouter.use(authenticate);
recruitmentRouter.use(requireRoles(["recruiter", "admin"]));

recruitmentRouter.get("/talent", searchTalentHandler);
recruitmentRouter.get("/talent/:profileId", getTalentProfileHandler);
