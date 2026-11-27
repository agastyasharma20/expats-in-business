import nodemailer, { type Transporter } from "nodemailer";

import { getEnv } from "./env";

type Email = { to: string; subject: string; text: string; html?: string };

let transport: Transporter | undefined;

/** "Name <address>" or a bare address, as in EMAIL_FROM. */
export function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || undefined, email: match[2]! } : { email: from.trim() };
}

/** Brevo's HTTPS API: works where SMTP ports are blocked. Never logs bodies or addresses. */
async function sendViaBrevoApi(apiKey: string, from: string, message: Email): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: parseSender(from),
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      htmlContent: message.html ?? message.text.replace(/\n/g, "<br>"),
    }),
  });
  if (!response.ok) throw new Error(`Brevo API refused the message (HTTP ${response.status})`);
}

/** Sends through Brevo's API when BREVO_API_KEY is set, otherwise through SMTP (Mailpit locally: http://localhost:8025). Never logs message bodies. */
export async function sendEmail({ to, subject, text, html }: Email): Promise<void> {
  const env = getEnv();
  if (env.EMAIL_DISABLED) {
    console.info("[email] skipped: EMAIL_DISABLED is on (sandbox, no mail server)");
    return;
  }
  if (env.BREVO_API_KEY) {
    await sendViaBrevoApi(env.BREVO_API_KEY, env.EMAIL_FROM, { to, subject, text, html });
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
