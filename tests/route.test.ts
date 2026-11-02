import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mailer', () => ({ sendMail: vi.fn() }));
import { sendMail } from '@/lib/mailer';
import { POST } from '@/app/api/inquiry/route';

const mocked = vi.mocked(sendMail);
let ipN = 0;
const payload = (o: Record<string, unknown> = {}) => ({
  type: 'project', name: 'Juan Dela Cruz', email: 'juan@example.com', preferredContact: 'email',
  message: 'I need a website for my small bakery in Pasig.', consent: true, website: '', startedAt: Date.now() - 10_000,
  projectType: 'Website', level: 'standard', timeline: '1-3 months', ...o,
});
const request = (p: object, ip = `10.0.0.${++ipN}`, withImage = true) => {
  const fd = new FormData();
  fd.set('payload', JSON.stringify(p));
  if (withImage) fd.append('images', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2])], 'a.jpg', { type: 'image/jpeg' }));
  return new Request('http://localhost/api/inquiry', { method: 'POST', body: fd, headers: { 'x-forwarded-for': `${ip}, 1.1.1.1` } });
};

beforeEach(() => {
  mocked.mockReset();
  mocked.mockResolvedValue(undefined);
  process.env.GMAIL_USER = 'owner@example.com';
  process.env.GMAIL_APP_PASSWORD = 'test-app-password';
});
afterEach(() => vi.restoreAllMocks());

describe('POST /api/inquiry', () => {
  it('sends a valid inquiry and returns a ref', async () => {
    const res = await POST(request(payload()));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ref).toMatch(/^INQ-\d{8}-[A-Z0-9]{4}$/);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked.mock.calls[0][0].attachments).toHaveLength(1);
  });

  it('returns 400 with field errors for an invalid inquiry', async () => {
    const res = await POST(request(payload({ email: 'nope' })));
    expect(res.status).toBe(400);
    expect((await res.json()).errors).toHaveProperty('email');
    expect(mocked).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed payload', async () => {
    const fd = new FormData(); fd.set('payload', '{not json');
    const res = await POST(new Request('http://localhost/api/inquiry', { method: 'POST', body: fd }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when the payload is valid JSON but not an object', async () => {
    const fd = new FormData(); fd.set('payload', 'null');
    const res = await POST(new Request('http://localhost/api/inquiry', { method: 'POST', body: fd }));
    expect(res.status).toBe(400);
  });

  it('returns 429 on the 6th request from the same IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(request(payload(), '10.9.9.9', false))).status);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });

  it('does not use up the limit on sends that failed', async () => {
    mocked.mockRejectedValue(new Error('smtp down'));
    for (let i = 0; i < 5; i++) expect((await POST(request(payload(), '10.8.8.8', false))).status).toBe(502);
    mocked.mockResolvedValue(undefined);
    expect((await POST(request(payload(), '10.8.8.8', false))).status).toBe(200);
  });

  it('rejects an old cached form that still sends budget, with a level error', async () => {
    const old = payload({ budget: '₱20k-50k' }) as Record<string, unknown>; delete old.level;
    const res = await POST(request(old));
    expect(res.status).toBe(400);
    expect((await res.json()).errors.level).toBeTruthy();
  });

  it('returns 502 without internals when sending fails', async () => {
    mocked.mockRejectedValue(new Error('SMTP auth failed for owner@example.com'));
    const res = await POST(request(payload()));
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).toContain('try again');
    expect(text).not.toContain('SMTP');
    expect(text).not.toContain('owner@example.com');
  });

  it('returns 500 when email env vars are missing', async () => {
    delete process.env.GMAIL_APP_PASSWORD;
    const res = await POST(request(payload()));
    expect(res.status).toBe(500);
    expect(await res.text()).toContain('Inquiry email not configured');
    expect(mocked).not.toHaveBeenCalled();
  });
});
