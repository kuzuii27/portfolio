'use client';

import { useState } from 'react';
import { MSG_LIMITS } from '@/lib/message';

type Status = { kind: 'idle' | 'sending' | 'sent' | 'error'; text?: string };

/** Visitors type their email and a message; the server mails it to me with Reply-To set to theirs. */
export function MessageForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus({ kind: 'sending' });
    setErrors({});
    try {
      const res = await fetch('/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { form.reset(); setStatus({ kind: 'sent', text: 'Sent. I will reply to your email.' }); return; }
      setErrors(data.errors ?? {});
      setStatus({ kind: 'error', text: data.error ?? data.errors?.form ?? 'Check the highlighted fields.' });
    } catch {
      setStatus({ kind: 'error', text: 'No connection. Please try again.' });
    }
  };

  const busy = status.kind === 'sending';
  return (
    <form className="msg-form" onSubmit={submit} noValidate aria-label="Send me an email">
      <div className="msg-row">
        <label>Your name <span>(optional)</span>
          <input name="name" autoComplete="name" maxLength={MSG_LIMITS.name} aria-invalid={!!errors.name} />
        </label>
        <label>Your email
          <input name="email" type="email" autoComplete="email" required maxLength={MSG_LIMITS.email} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'msg-email-err' : undefined} />
          {errors.email && <em id="msg-email-err">{errors.email}</em>}
        </label>
      </div>
      <label>Message
        <textarea name="message" rows={4} required maxLength={MSG_LIMITS.message} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'msg-text-err' : undefined} />
        {errors.message && <em id="msg-text-err">{errors.message}</em>}
      </label>
      <input className="msg-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="msg-foot">
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send email'}</button>
        <p role="status" aria-live="polite" data-kind={status.kind}>{status.text}</p>
      </div>
    </form>
  );
}
