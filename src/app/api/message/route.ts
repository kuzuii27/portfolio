import { buildMessageMail, validateMessage } from '@/lib/message';
import { sendMail } from '@/lib/mailer';
import { allow } from '@/lib/rateLimit';

const fail = (status: number, body: object) => Response.json({ ok: false, ...body }, { status });

export async function POST(request: Request) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return fail(500, { error: 'Messages are not set up yet. Please use the Email button.' });

  const key = `msg:${request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'}`;
  const now = Date.now();
  if (!allow(key, now, undefined, undefined, false)) return fail(429, { error: 'Too many messages. Try again later.' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, { errors: { form: 'The message could not be read.' } });
  }
  const result = validateMessage(body);
  if (!result.ok) return fail(400, { errors: result.errors });

  try {
    await sendMail(buildMessageMail(result.value));
  } catch (err) {
    console.error('message send failed', err instanceof Error ? err.name : 'unknown'); // never log credentials or visitor data
    return fail(502, { error: 'Could not send right now. Please try again.' });
  }
  allow(key, now); // only delivered messages count toward the hourly limit
  return Response.json({ ok: true });
}
