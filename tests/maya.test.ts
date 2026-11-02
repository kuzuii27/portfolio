import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/demo/maya-checkout/route';

let ipN = 0;
const req = (body: unknown, ip = `10.9.0.${++ipN}`) =>
  new Request('https://kuzuii.vercel.app/api/demo/maya-checkout', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  });
const ok = () => new Response(JSON.stringify({ checkoutId: 'abc', redirectUrl: 'https://payments-web-sandbox.paymaya.com/v2/checkout?id=abc' }), { status: 200 });
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ok());
  vi.stubGlobal('fetch', fetchMock);
  process.env.MAYA_PUBLIC_KEY = 'pk-test-key';
});
afterEach(() => vi.unstubAllGlobals());

describe('POST /api/demo/maya-checkout', () => {
  it('creates a sandbox checkout for a fixed 500 PHP', async () => {
    const res = await POST(req({ service: 'Cleaning', firstName: 'Juan' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.redirectUrl).toBe('https://payments-web-sandbox.paymaya.com/v2/checkout?id=abc');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://pg-sandbox.paymaya.com/checkout/v1/checkouts');
    expect(init.headers.authorization).toBe('Basic ' + Buffer.from('pk-test-key:').toString('base64'));
    const body = JSON.parse(init.body);
    expect(body.totalAmount).toEqual({ value: 500, currency: 'PHP' });
    expect(body.requestReferenceNumber).toMatch(/^NGITI-\d{8}-[A-Z0-9]{4}$/);
    expect(body.redirectUrl.success).toBe(`https://kuzuii.vercel.app/demos/high/booking-result.html?status=success&ref=${body.requestReferenceNumber}`);
    expect(body.redirectUrl.failure).toContain('status=failure');
    expect(body.redirectUrl.cancel).toContain('status=cancel');
  });

  it('ignores any amount sent by the browser', async () => {
    await POST(req({ service: 'Braces', firstName: 'Ana', amount: 1, totalAmount: { value: 1 } }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).totalAmount.value).toBe(500);
  });

  it('rejects unknown services and bad names', async () => {
    for (const b of [{ service: 'Surgery', firstName: 'Juan' }, { service: 'Cleaning', firstName: '' }, { service: 'Cleaning', firstName: 'x'.repeat(51) }, { service: 'Cleaning', firstName: 'a\nb' }, null, 'nope'])
      expect((await POST(req(b))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('503 fallback without a key', async () => {
    delete process.env.MAYA_PUBLIC_KEY;
    const res = await POST(req({ service: 'Cleaning', firstName: 'Juan' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ fallback: true });
  });

  it('502 when Maya fails or times out', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect((await POST(req({ service: 'Cleaning', firstName: 'Juan' }))).status).toBe(502);
    fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
    expect((await POST(req({ service: 'Cleaning', firstName: 'Juan' }))).status).toBe(502);
    expect(fetchMock.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('rate-limits after 10 checkouts per hour per IP', async () => {
    for (let i = 0; i < 10; i++) expect((await POST(req({ service: 'Cleaning', firstName: 'Juan' }, '10.9.9.9'))).status).toBe(200);
    expect((await POST(req({ service: 'Cleaning', firstName: 'Juan' }, '10.9.9.9'))).status).toBe(429);
  });
});
