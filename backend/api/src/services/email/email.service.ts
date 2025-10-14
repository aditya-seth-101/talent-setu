import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
  null;

function getTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_PORT && env.EMAIL_FROM) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USERNAME && env.SMTP_PASSWORD
          ? {
              user: env.SMTP_USERNAME,
              pass: env.SMTP_PASSWORD,
            }
          : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    logger.warn(
      "SMTP configuration missing; falling back to JSON transport. Emails will be logged but not delivered."
    );
  }

  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const mailer = getTransporter();

  const result = await mailer.sendMail({
    from: env.EMAIL_FROM ?? "no-reply@talent-setu.local",
    to,
    subject,
    html,
    text,
  });

  logger.info({ to, subject, messageId: result.messageId }, "Email dispatched");
  return result;
}
