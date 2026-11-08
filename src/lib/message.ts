import type { Mail } from '@/lib/email';

export const MSG_LIMITS = { name: 80, email: 254, message: 2000 } as const;
export type MessageFields = { name: string; email: string; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Trust boundary: everything comes from an anonymous visitor. */
export function validateMessage(raw: unknown): { ok: true; value: MessageFields } | { ok: false; errors: Record<string, string> } {
  const f = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof f[k] === 'string' ? (f[k] as string).trim() : '');
  const errors: Record<string, string> = {};
  const name = str('name').replace(/[\r\n\t]+/g, ' ');
  const email = str('email');
  const message = str('message');
  if (str('website')) errors.form = 'Could not send.'; // honeypot: real visitors never see this field
  if (name.length > MSG_LIMITS.name) errors.name = `Keep your name under ${MSG_LIMITS.name} characters.`;
  if (!EMAIL.test(email) || email.length > MSG_LIMITS.email) errors.email = 'Enter a valid email so I can reply.';
  if (!message) errors.message = 'Write a short message.';
  else if (message.length > MSG_LIMITS.message) errors.message = `Keep it under ${MSG_LIMITS.message} characters.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { name, email, message } };
}

export function buildMessageMail(v: MessageFields): Mail {
  const who = v.name || v.email;
  return {
    subject: `Portfolio message from ${who}`,
    replyTo: v.email,
    text: `From: ${who} <${v.email}>\n\n${v.message}`,
    html: `<p><b>${esc(who)}</b> &lt;${esc(v.email)}&gt;</p><p style="white-space:pre-wrap">${esc(v.message)}</p>`,
    attachments: [],
  };
}
