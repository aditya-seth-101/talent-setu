import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as profileService from "../services/profile/profile.service.js";

const idParamSchema = z.object({
  id: z.string().length(24, "Invalid profile id"),
});

export async function getMyProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const profile = await profileService.getProfileForUser(userId);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const profile = await profileService.updateProfileForUser(userId, req.body);

    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
}

export async function getProfileById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const profile = await profileService.getProfileById(id);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
}

export async function searchProfiles(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await profileService.searchProfiles(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
