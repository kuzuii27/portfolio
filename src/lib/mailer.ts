import { createTransport } from 'nodemailer';
import type { Mail } from '@/lib/email';

// Gmail SMTP with an app password. Credentials come only from env vars.
export async function sendMail(mail: Mail): Promise<void> {
  const user = process.env.GMAIL_USER!;
  const transport = createTransport({
    service: 'gmail',
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD! },
    // Fail fast so the visitor gets the 502 "try again" instead of a multi-minute spinner.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  await transport.sendMail({
    from: `Portfolio inquiries <${user}>`,
    to: process.env.INQUIRY_TO || user,
    replyTo: mail.replyTo,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    attachments: mail.attachments,
  });
}
