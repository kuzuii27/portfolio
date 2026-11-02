import { describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn().mockResolvedValue({});
vi.mock('nodemailer', () => ({ createTransport: vi.fn(() => ({ sendMail })) }));
import { createTransport } from 'nodemailer';
import { sendMail as send } from '@/lib/mailer';

describe('sendMail', () => {
  it('gives up on a hung SMTP connection within seconds, not minutes', async () => {
    process.env.GMAIL_USER = 'owner@example.com'; process.env.GMAIL_APP_PASSWORD = 'x';
    await send({ subject: 's', replyTo: 'v@example.com', html: '', text: '', attachments: [] });
    const opts = vi.mocked(createTransport).mock.calls[0][0] as Record<string, number>;
    expect(opts.connectionTimeout).toBeLessThanOrEqual(10_000);
    expect(opts.greetingTimeout).toBeLessThanOrEqual(10_000);
    expect(opts.socketTimeout).toBeLessThanOrEqual(20_000);
  });
});
