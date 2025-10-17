import type { NextFunction, Request, Response } from "express";
import * as recruitmentService from "../services/recruitment/recruitment.service.js";

export async function searchTalentHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await recruitmentService.searchTalent(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTalentProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { profileId } = req.params;
    const result = await recruitmentService.getTalentProfileDetail(profileId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
