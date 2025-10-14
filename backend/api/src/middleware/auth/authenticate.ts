import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../utils/http-errors.js";
import { verifyAccessToken } from "../../services/auth/token.service.js";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    next(new UnauthorizedError("Missing authorization header"));
    return;
  }

  const token = header.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      sessionId: payload.sid,
    };
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}
