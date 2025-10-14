import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.js";
import {
  getMyProfile,
  updateMyProfile,
  getProfileById,
  searchProfiles,
} from "../controllers/profile.controller.js";

export const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get("/me", getMyProfile);
profileRouter.put("/me", updateMyProfile);
profileRouter.get("/", searchProfiles);
profileRouter.get("/:id", getProfileById);
