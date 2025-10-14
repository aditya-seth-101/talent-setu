import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as authService from "../services/auth/auth.service.js";
import { verifyRefreshToken } from "../services/auth/token.service.js";

const roleEnum = z.enum(["student", "recruiter", "admin", "proctor"]);

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roles: z.array(roleEnum).default(["student"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

const verifyEmailSchema = z.object({
  verificationId: z.string().min(1),
  token: z.string().min(1),
});

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const body = signupSchema.parse(req.body);
    const result = await authService.signup(body, requestContext(req));
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body, requestContext(req));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const payload = verifyRefreshToken(refreshToken);
    const tokens = await authService.refresh(
      refreshToken,
      {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
        sessionId: payload.sid,
      },
      requestContext(req)
    );
    res.status(200).json({ tokens });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = logoutSchema.parse(req.body);
    const payload = verifyRefreshToken(refreshToken);

    await authService.logout(payload.sid, payload.sub);

    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response) {
  res.status(200).json({ user: req.user });
}

function requestContext(req: Request) {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ip: req.ip,
  };
}

export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = verifyEmailSchema.parse(req.body);
    const user = await authService.verifyEmail(body.verificationId, body.token);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function resendVerification(
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

    const result = await authService.resendVerification(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
