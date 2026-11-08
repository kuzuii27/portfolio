import { describe, expect, it } from 'vitest';
import { buildMessageMail, validateMessage } from '@/lib/message';

describe('visitor message', () => {
  it('accepts a normal message and trims it', () => {
    const r = validateMessage({ name: ' Ana ', email: 'ana@example.com', message: ' Hi ' });
    expect(r).toEqual({ ok: true, value: { name: 'Ana', email: 'ana@example.com', message: 'Hi' } });
  });

  it('rejects a bad email, an empty message and the honeypot', () => {
    expect(validateMessage({ email: 'nope', message: 'x' })).toMatchObject({ ok: false, errors: { email: expect.any(String) } });
    expect(validateMessage({ email: 'a@b.co', message: '  ' })).toMatchObject({ ok: false, errors: { message: expect.any(String) } });
    expect(validateMessage({ email: 'a@b.co', message: 'x', website: 'http://spam' })).toMatchObject({ ok: false });
    expect(validateMessage(null)).toMatchObject({ ok: false });
  });

  it('caps the message length', () => {
    expect(validateMessage({ email: 'a@b.co', message: 'x'.repeat(2001) })).toMatchObject({ ok: false });
  });

  it('strips line breaks from the name and escapes HTML in the mail', () => {
    const r = validateMessage({ name: 'A\r\nBcc: x@y.z', email: 'a@b.co', message: '<script>alert(1)</script>' });
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.name).not.toMatch(/[\r\n]/);
    const mail = buildMessageMail(r.value);
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.html).not.toContain('<script>');
    expect(mail.replyTo).toBe('a@b.co');
  });
});
