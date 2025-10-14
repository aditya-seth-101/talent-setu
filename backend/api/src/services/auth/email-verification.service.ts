import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { sendEmail } from "../email/email.service.js";
import { hashToken, verifyToken } from "../../utils/password.js";
import type { UserDocument } from "../../models/user.model.js";
import {
  createEmailVerification,
  deleteVerificationsForUser,
  findEmailVerificationById,
  markVerificationUsed,
} from "../../repositories/email-verification.repository.js";
import { markUserEmailVerified } from "../../repositories/user.repository.js";
import { BadRequestError, UnauthorizedError } from "../../utils/http-errors.js";

const VERIFICATION_SUBJECT = "Verify your Talent Setu email";

export async function sendVerificationEmail(user: UserDocument) {
  await deleteVerificationsForUser(user._id);

  const token = randomBytes(32).toString("hex");
  const tokenHash = await hashToken(token);
  const verificationId = new ObjectId();

  const expiresAt = new Date(
    Date.now() + env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000
  );

  await createEmailVerification({
    _id: verificationId,
    userId: user._id,
    email: user.email,
    tokenHash,
    expiresAt,
  });

  const verificationUrl = new URL(env.EMAIL_VERIFICATION_BASE_URL);
  verificationUrl.searchParams.set(
    "verificationId",
    verificationId.toHexString()
  );
  verificationUrl.searchParams.set("token", token);

  const html = `<p>Hello ${user.email},</p>
<p>Please verify your Talent Setu account by clicking the link below:</p>
<p><a href="${verificationUrl.toString()}">Verify my email</a></p>
<p>This link expires in ${env.EMAIL_VERIFICATION_TTL_HOURS} hours.</p>`;

  await sendEmail({
    to: user.email,
    subject: VERIFICATION_SUBJECT,
    html,
    text: `Verify your Talent Setu account: ${verificationUrl.toString()}`,
  });
}

export async function verifyEmail(verificationId: string, token: string) {
  const record = await findEmailVerificationById(verificationId);

  if (!record) {
    throw new BadRequestError("Verification token not found");
  }

  if (record.usedAt) {
    throw new BadRequestError("Verification token already used");
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError("Verification token expired");
  }

  const valid = await verifyToken(token, record.tokenHash);

  if (!valid) {
    throw new UnauthorizedError("Verification token invalid");
  }

  await markUserEmailVerified(record.userId);
  await markVerificationUsed(record._id);

  return record.userId;
}
