// Creates a Maya Checkout for the High quality demo's booking deposit. SANDBOX ONLY: the host is fixed, so a live key can't take real money.
import { allow } from '@/lib/rateLimit';

const MAYA_SANDBOX = 'https://pg-sandbox.paymaya.com/checkout/v1/checkouts';
const SERVICES = ['Consultation', 'Cleaning', 'Filling', 'Extraction', 'Whitening', 'Braces'];
const DEPOSIT = 500; // PHP, fixed here; the browser never sets the amount

const fail = (status: number, error: string) => Response.json({ error }, { status });

function bookingRef(now: Date): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const tail = Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  const d = now.toISOString().slice(0, 10).replaceAll('-', '');
  return `NGITI-${d}-${tail}`;
}

export async function POST(request: Request) {
  const key = process.env.MAYA_PUBLIC_KEY;
  if (!key) return Response.json({ fallback: true }, { status: 503 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const now = Date.now();
  if (!allow(`maya:${ip}`, now, 10)) return fail(429, 'Too many requests - try again later.');

  let body: unknown;
  try { body = await request.json(); } catch { return fail(400, 'Invalid request.'); }
  const { service, firstName } = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const name = typeof firstName === 'string' ? firstName.trim() : '';
  if (typeof service !== 'string' || !SERVICES.includes(service)) return fail(400, 'Choose a service.');
  if (!name || name.length > 50 || /[\r\n]/.test(name)) return fail(400, 'Enter your first name.');

  const ref = bookingRef(new Date(now));
  const back = (status: string) => `${new URL(request.url).origin}/demos/high/booking-result.html?status=${status}&ref=${ref}`;
  try {
    const res = await fetch(MAYA_SANDBOX, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', authorization: 'Basic ' + Buffer.from(`${key}:`).toString('base64') },
      body: JSON.stringify({
        totalAmount: { value: DEPOSIT, currency: 'PHP' },
        buyer: { firstName: name },
        items: [{ name: `${service} booking deposit`, quantity: 1, totalAmount: { value: DEPOSIT } }],
        redirectUrl: { success: back('success'), failure: back('failure'), cancel: back('cancel') },
        requestReferenceNumber: ref,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`maya ${res.status}`);
    const data = (await res.json()) as { redirectUrl?: unknown };
    if (typeof data.redirectUrl !== 'string' || !data.redirectUrl.startsWith('https://')) throw new Error('maya: no redirectUrl');
    return Response.json({ redirectUrl: data.redirectUrl, ref });
  } catch (err) {
    console.error('maya checkout failed', ref, err instanceof Error ? err.message : 'unknown'); // never log the key or visitor data
    return fail(502, 'Could not start the payment.');
  }
}
