import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.js";
import { requireRoles } from "../middleware/rbac.js";
import {
  listTechnologyRequestsHandler,
  requestTechnologyHandler,
  reviewTechnologyRequestHandler,
  searchTechnologyDirectoryHandler,
} from "../controllers/technology.controller.js";

export const technologyRouter = Router();

technologyRouter.use(authenticate);

technologyRouter.get("/", searchTechnologyDirectoryHandler);
technologyRouter.post(
  "/requests",
  requireRoles(["recruiter", "admin"]),
  requestTechnologyHandler
);
technologyRouter.get(
  "/requests",
  requireRoles(["admin"]),
  listTechnologyRequestsHandler
);
technologyRouter.post(
  "/requests/:requestId/review",
  requireRoles(["admin"]),
  reviewTechnologyRequestHandler
);
