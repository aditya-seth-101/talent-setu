import { ObjectId } from "mongodb";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/http-errors.js";
import {
  hashPassword,
  verifyPassword,
  hashToken,
  verifyToken,
} from "../../utils/password.js";
import {
  createUser,
  findUserByEmail,
  updateUserLoginTimestamp,
  findUserById,
} from "../../repositories/user.repository.js";
import type { Role } from "../../middleware/rbac.js";
import { createTokenPair, type TokenPair } from "./token.service.js";
import { mapUserToPublic } from "../../models/user.model.js";
import {
  createSession,
  findActiveSessionById,
  updateSessionToken,
  revokeSession,
} from "../../repositories/session.repository.js";
import { env } from "../../config/env.js";
import type { SessionDocument } from "../../models/session.model.js";
import {
  sendVerificationEmail,
  verifyEmail as verifyEmailToken,
} from "./email-verification.service.js";
import { logger } from "../../config/logger.js";
import {
  ensureDefaultProfileForUser,
  getProfileForUser,
} from "../profile/profile.service.js";

interface SignupInput {
  email: string;
  password: string;
  roles: Role[];
}

interface LoginInput {
  email: string;
  password: string;
}

interface RequestContext {
  userAgent?: string;
  ip?: string;
}

export async function signup(
  { email, password, roles }: SignupInput,
  context: RequestContext
) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new BadRequestError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, passwordHash, roles });
  const profile = await ensureDefaultProfileForUser({
    userId: user._id,
    email: user.email,
  });
  const { tokens } = await createSessionWithTokens({
    userId: user._id,
    email: user.email,
    roles: user.roles,
    context,
  });

  let emailVerificationSent = false;
  try {
    await sendVerificationEmail(user);
    emailVerificationSent = true;
  } catch (error) {
    logger.error({ err: error }, "Failed to send verification email");
  }

  return {
    user: mapUserToPublic(user),
    tokens,
    emailVerificationSent,
    profile,
  };
}

export async function login(
  { email, password }: LoginInput,
  context: RequestContext
) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  await updateUserLoginTimestamp(user._id);

  const { tokens } = await createSessionWithTokens({
    userId: user._id,
    email: user.email,
    roles: user.roles,
    context,
  });

  const profile = await getProfileForUser(user._id.toHexString());

  return {
    user: mapUserToPublic(user),
    tokens,
    emailVerificationRequired: !user.emailVerified,
    profile,
  };
}

export async function refresh(
  refreshToken: string,
  payload: {
    userId: string;
    email: string;
    roles: Role[];
    sessionId: string;
  },
  context: RequestContext
): Promise<TokenPair> {
  const session = await findActiveSessionById(payload.sessionId);

  if (!session) {
    throw new UnauthorizedError("Session has been revoked");
  }

  if (session.userId.toHexString() !== payload.userId) {
    await revokeSession(session._id);
    throw new UnauthorizedError("Session does not match user");
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await revokeSession(session._id);
    throw new UnauthorizedError("Session has expired");
  }

  const tokenValid = await verifyToken(refreshToken, session.tokenHash);
  if (!tokenValid) {
    await revokeSession(session._id);
    throw new UnauthorizedError("Refresh token invalid");
  }

  const tokens = createTokenPair({
    sub: payload.userId,
    email: payload.email,
    roles: payload.roles,
    sid: payload.sessionId,
  });

  const expiresAt = calculateRefreshExpiry();
  const tokenHash = await hashToken(tokens.refreshToken);
  await updateSessionToken(
    new ObjectId(payload.sessionId),
    tokenHash,
    expiresAt,
    context
  );

  return tokens;
}

export async function logout(sessionId: string, userId: string) {
  const session = await findActiveSessionById(sessionId);

  if (!session) {
    return;
  }

  if (session.userId.toHexString() !== userId) {
    return;
  }

  await revokeSession(session._id);
}

export async function verifyEmail(verificationId: string, token: string) {
  const userId = await verifyEmailToken(verificationId, token);
  const user = await findUserById(userId);

  if (!user) {
    throw new BadRequestError("User not found for verification token");
  }

  return mapUserToPublic({ ...user, emailVerified: true });
}

export async function resendVerification(userId: string) {
  const user = await findUserById(userId);

  if (!user) {
    throw new BadRequestError("User not found");
  }

  if (user.emailVerified) {
    return { alreadyVerified: true };
  }

  await sendVerificationEmail(user);

  return { emailVerificationSent: true };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const profile = await getProfileForUser(userId);

  return {
    user: mapUserToPublic(user),
    profile,
  };
}

async function createSessionWithTokens({
  userId,
  email,
  roles,
  context,
}: {
  userId: ObjectId;
  email: string;
  roles: Role[];
  context: RequestContext;
}): Promise<{ tokens: TokenPair; session: SessionDocument }> {
  const sessionId = new ObjectId();
  const tokens = createTokenPair({
    sub: userId.toHexString(),
    email,
    roles,
    sid: sessionId.toHexString(),
  });

  const tokenHash = await hashToken(tokens.refreshToken);
  const expiresAt = calculateRefreshExpiry();

  const session = await createSession({
    _id: sessionId,
    userId,
    tokenHash,
    userAgent: context.userAgent,
    ip: context.ip,
    expiresAt,
  });

  return { tokens, session };
}

function calculateRefreshExpiry(): Date {
  const ttlDays = env.REFRESH_TOKEN_TTL_DAYS;
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}
