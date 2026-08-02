import nodemailer from "nodemailer";

/**
 * Defaults to local Mailpit (no auth) when SMTP_HOST is unset, same pattern as Supabase Auth's
 * own local email delivery. Set SMTP_HOST/PORT/USER/PASS in .env.local for real Gmail SMTP.
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "127.0.0.1",
  port: Number(process.env.SMTP_PORT ?? 54325),
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Agentic OS <notifications@agentcos.dev>",
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
