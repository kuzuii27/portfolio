import { describe, expect, it } from 'vitest';
import { buildEmail } from '@/lib/email';
import type { ImageFile, InquiryFields } from '@/lib/inquiry';

const base: InquiryFields = {
  type: 'project', name: 'Juan Dela Cruz', email: 'juan@example.com', preferredContact: 'viber', phone: '09171234567',
  message: 'I need a website for my bakery.', consent: true, website: '', startedAt: 0,
  projectType: 'Website', budget: '₱20k-50k', timeline: '1-3 months', color: '#0d9488', font: 'technical',
  captions: ['Logo I like'],
};
const img: ImageFile = { name: 'IMG_001.JPG', type: 'image/jpeg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 1]) };

describe('buildEmail', () => {
  it('uses the project subject with the ref', () =>
    expect(buildEmail(base, [], 'INQ-20261102-AB12').subject).toBe('New project inquiry - INQ-20261102-AB12'));

  it('uses the job subject for job inquiries', () => {
    const job: InquiryFields = { ...base, type: 'job', company: 'Example Corp', role: '.NET Developer', employmentType: 'Full-time', workSetup: 'Remote' };
    expect(buildEmail(job, [], 'INQ-20261102-AB12').subject).toBe('New job inquiry - INQ-20261102-AB12');
  });

  it('sets Reply-To to the visitor', () => expect(buildEmail(base, [], 'R').replyTo).toBe('juan@example.com'));

  it('escapes HTML from visitor input', () => {
    const m = buildEmail({ ...base, name: '<script>alert(1)</script>', message: '<img src=x onerror=alert(1)> please' }, [], 'R');
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.html).not.toContain('<script>');
    expect(m.html).not.toContain('<img src=x');
  });

  it('shows the colour as hex and swatch, and the font label', () => {
    const m = buildEmail(base, [], 'R');
    expect(m.html).toContain('#0d9488');
    expect(m.html).toContain('background:#0d9488');
    expect(m.html).toContain('Technical');
  });

  it('attaches images as image-N with captions listed', () => {
    const m = buildEmail(base, [img], 'R');
    expect(m.attachments).toHaveLength(1);
    expect(m.attachments[0]).toMatchObject({ filename: 'image-1.jpg', contentType: 'image/jpeg' });
    expect(Buffer.isBuffer(m.attachments[0].content)).toBe(true);
    expect(m.html).toContain('image-1.jpg');
    expect(m.html).toContain('Logo I like');
  });

  it('puts every filled field label in the plain-text version', () => {
    const t = buildEmail(base, [], 'R').text;
    for (const label of ['Name', 'Email', 'Phone', 'Preferred contact', 'Project type', 'Budget', 'Timeline', 'Brand colour', 'Font style', 'Message'])
      expect(t).toContain(label);
  });
});
