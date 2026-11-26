import nodemailer, { type Transporter } from "nodemailer";

import { getEnv } from "./env";

type Email = { to: string; subject: string; text: string; html?: string };

let transport: Transporter | undefined;

/** Sends through SMTP (Mailpit locally: http://localhost:8025). Never logs message bodies. */
export async function sendEmail({ to, subject, text, html }: Email): Promise<void> {
  const env = getEnv();
  if (env.EMAIL_DISABLED) {
    console.info("[email] skipped: EMAIL_DISABLED is on (sandbox, no mail server)");
    return;
  }
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }, requireTLS: !env.SMTP_SECURE }
      : {}),
  });
  await transport.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
    html: html ?? text.replace(/\n/g, "<br>"),
  });
}

/** Minimal branded HTML with one call-to-action link (inline styles: email clients ignore CSS). */
export function actionEmail({
  heading,
  body,
  cta,
  url,
}: {
  heading: string;
  body: string;
  cta: string;
  url: string;
}) {
  const safe = (s: string) =>
    s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  return {
    text: `${heading}\n\n${body}\n\n${cta}: ${url}`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;color:#0f1a1a"><h1 style="color:#093334;font-size:22px">${safe(heading)}</h1><p>${safe(body)}</p><p><a href="${safe(url)}" style="display:inline-block;background:#12635a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${safe(cta)}</a></p><p style="color:#51605f;font-size:13px">${safe(url)}</p></div>`,
  };
}
