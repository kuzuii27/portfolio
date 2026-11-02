import { describe, expect, it } from 'vitest';
import { LIMITS, isRealImage, makeRef, validateInquiry, type ImageFile, type InquiryFields } from '@/lib/inquiry';

const NOW = 1_800_000_000_000;
const project = (o: Partial<InquiryFields> = {}): InquiryFields => ({
  type: 'project', name: 'Juan Dela Cruz', email: 'juan@example.com', preferredContact: 'email',
  message: 'I need a website for my small bakery in Pasig.', consent: true, website: '', startedAt: NOW - 10_000,
  projectType: 'Website', budget: '₱20k-50k', timeline: '1-3 months', ...o,
});
const job = (o: Partial<InquiryFields> = {}): InquiryFields => ({
  type: 'job', name: 'Ana Reyes', email: 'ana@example.com', preferredContact: 'email',
  message: 'We are hiring a .NET developer for our team.', consent: true, website: '', startedAt: NOW - 10_000,
  company: 'Example Corp', role: '.NET Developer', employmentType: 'Full-time', workSetup: 'Remote', ...o,
});
const jpeg = (size = 10): ImageFile => {
  const bytes = new Uint8Array(size); bytes.set([0xff, 0xd8, 0xff]);
  return { name: 'a.jpg', type: 'image/jpeg', bytes };
};
const errors = (f: InquiryFields, imgs: ImageFile[] = []) => {
  const r = validateInquiry(f, imgs, NOW);
  return r.ok ? {} : r.errors;
};

describe('validateInquiry', () => {
  it('accepts a valid project inquiry', () => expect(validateInquiry(project(), [jpeg()], NOW).ok).toBe(true));
  it('accepts a valid job inquiry', () => expect(validateInquiry(job(), [], NOW).ok).toBe(true));
  it('requires name, email and consent', () =>
    expect(Object.keys(errors(project({ name: ' ', email: '', consent: false })))).toEqual(expect.arrayContaining(['name', 'email', 'consent'])));
  it('rejects header injection in name', () => expect(errors(project({ name: 'A\r\nBcc: x@y.z' }))).toHaveProperty('name'));
  it('rejects header injection in email', () => expect(errors(project({ email: 'a@b.c\nBcc:x' }))).toHaveProperty('email'));
  it('rejects a 19-character message', () => expect(errors(project({ message: 'x'.repeat(19) }))).toHaveProperty('message'));
  it('accepts a spaced PH mobile number', () => expect(errors(project({ phone: '0917 123 4567' }))).not.toHaveProperty('phone'));
  it('rejects a bad phone number', () => expect(errors(project({ phone: '12345' }))).toHaveProperty('phone'));
  it('flags a filled honeypot as spam', () => expect(errors(project({ website: 'x' }))).toHaveProperty('spam'));
  it('flags a form submitted in 1 second as spam', () => expect(errors(project({ startedAt: NOW - 1000 }))).toHaveProperty('spam'));
  it('rejects a 4th image', () => expect(errors(project(), [jpeg(), jpeg(), jpeg(), jpeg()])).toHaveProperty('images'));
  it('rejects attachments over 4 MB in total', () =>
    expect(errors(project(), [jpeg(LIMITS.maxTotalBytes - 5), jpeg(6)])).toHaveProperty('images'));
  it('rejects a file whose bytes are not an image', () => {
    const fake: ImageFile = { name: 'x.jpg', type: 'image/jpeg', bytes: new Uint8Array([0x3c, 0x68, 0x74]) };
    expect(isRealImage(fake)).toBe(false);
    expect(errors(project(), [fake])).toHaveProperty('images');
  });
  it('recognises png and webp signatures', () => {
    expect(isRealImage({ name: 'a.png', type: 'image/png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]) })).toBe(true);
    const webp = new Uint8Array(12); webp.set([0x52, 0x49, 0x46, 0x46]); webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(isRealImage({ name: 'a.webp', type: 'image/webp', bytes: webp })).toBe(true);
  });
  it('requires company and role for a job', () =>
    expect(Object.keys(errors(job({ company: '', role: '' })))).toEqual(expect.arrayContaining(['company', 'role'])));
  it('requires project type, budget and timeline for a project', () =>
    expect(Object.keys(errors(project({ projectType: '', budget: '', timeline: '' })))).toEqual(expect.arrayContaining(['projectType', 'budget', 'timeline'])));
  it('rejects a colour that is not #rrggbb', () => expect(errors(project({ color: 'red' }))).toHaveProperty('color'));
  it('accepts a #rrggbb colour', () => expect(errors(project({ color: '#0d9488' }))).not.toHaveProperty('color'));
});

describe('makeRef', () => {
  it('formats INQ-YYYYMMDD-XXXX from UTC date', () =>
    expect(makeRef(new Date('2026-11-02T03:00:00Z'), () => 0)).toBe('INQ-20261102-AAAA'));
});
