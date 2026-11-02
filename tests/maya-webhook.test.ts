import { describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/demo/maya-webhook/route';

const req = (body: string) => new Request('https://kuzuii.vercel.app/api/demo/maya-webhook', { method: 'POST', body, headers: { 'content-type': 'application/json' } });

describe('POST /api/demo/maya-webhook', () => {
  it('acknowledges a Maya payment notification and logs only status and ref', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const res = await POST(req(JSON.stringify({ status: 'PAYMENT_SUCCESS', requestReferenceNumber: 'NGITI-20261102-AB12', buyer: { firstName: 'Juan' }, fundSource: { details: { last4: '2346' } } })));
    expect(res.status).toBe(200);
    expect(log).toHaveBeenCalledWith('maya webhook', 'PAYMENT_SUCCESS', 'NGITI-20261102-AB12');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Juan|2346/);
    log.mockRestore();
  });

  it('still answers 200 to junk so Maya does not retry forever', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect((await POST(req('not json'))).status).toBe(200);
    expect(log).toHaveBeenCalledWith('maya webhook', 'unknown', 'unknown');
    log.mockRestore();
  });
});
