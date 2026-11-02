import { buildEmail } from '@/lib/email';
import { makeRef, validateInquiry, type ImageFile, type InquiryFields } from '@/lib/inquiry';
import { sendMail } from '@/lib/mailer';
import { allow } from '@/lib/rateLimit';

const fail = (status: number, body: object) => Response.json({ ok: false, ...body }, { status });

export async function POST(request: Request) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
    return fail(500, { error: 'Inquiry email not configured' });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const now = Date.now();
  if (!allow(ip, now, undefined, undefined, false)) return fail(429, { error: 'Too many requests - try again later.' });

  let fields: InquiryFields;
  const images: ImageFile[] = [];
  try {
    const form = await request.formData();
    fields = JSON.parse(String(form.get('payload')));
    if (!fields || typeof fields !== 'object') throw new Error('payload is not an object');
    for (const entry of form.getAll('images')) {
      if (entry instanceof File) images.push({ name: entry.name, type: entry.type, bytes: new Uint8Array(await entry.arrayBuffer()) });
    }
  } catch {
    return fail(400, { errors: { form: 'The form could not be read. Please try again.' } });
  }

  const result = validateInquiry(fields, images, now);
  if (!result.ok) return fail(400, { errors: result.errors });

  const ref = makeRef(new Date(now));
  try {
    await sendMail(buildEmail(result.value, images, ref));
  } catch (err) {
    console.error('inquiry send failed', ref, err instanceof Error ? err.name : 'unknown'); // never log credentials or visitor data
    return fail(502, { error: 'Could not send right now - please try again.' });
  }
  allow(ip, now); // only delivered inquiries count toward the hourly limit
  return Response.json({ ok: true, ref });
}
