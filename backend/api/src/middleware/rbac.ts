import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../utils/http-errors.js";

export type Role = "student" | "recruiter" | "admin" | "proctor";

export function requireRoles(allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roles = (req.user?.roles ?? []) as Role[];
    const isAllowed = roles.some((role) => allowed.includes(role));

    if (!isAllowed) {
      next(
        new ForbiddenError("You do not have permission to perform this action")
      );
      return;
    }

    next();
  };
}
