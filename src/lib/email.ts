import type { ImageFile, InquiryFields } from '@/lib/inquiry';

export interface Mail {
  subject: string;
  replyTo: string;
  html: string;
  text: string;
  attachments: { filename: string; content: Buffer; contentType: string }[];
}

const FONT_LABELS = { modern: 'Modern', classic: 'Classic', friendly: 'Friendly', technical: 'Technical', none: 'No preference' } as const;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function buildEmail(f: InquiryFields, images: ImageFile[], ref: string): Mail {
  const files = images.map((img, i) => ({ img, filename: `image-${i + 1}.${EXT[img.type] ?? 'jpg'}`, caption: f.captions?.[i]?.trim() }));

  const rows: [string, string | undefined][] = [
    ['Name', f.name],
    ['Email', f.email],
    ['Phone', f.phone],
    ['Preferred contact', f.preferredContact],
    ...(f.type === 'project'
      ? ([
          ['Project type', f.projectType],
          ['Budget', f.budget],
          ['Timeline', f.timeline],
          ['Brand colour', f.color],
          ['Font style', f.font ? FONT_LABELS[f.font] : undefined],
        ] as [string, string | undefined][])
      : ([
          ['Company', f.company],
          ['Role', f.role],
          ['Employment type', f.employmentType],
          ['Work setup', f.workSetup],
          ['Salary range', f.salary],
        ] as [string, string | undefined][])),
  ];
  const filled = rows.filter(([, v]) => v);

  const cell = (label: string, value: string) => {
    const swatch = label === 'Brand colour' ? `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px;margin-right:6px;background:${esc(value)}"></span>` : '';
    return `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top">${esc(label)}</td><td style="padding:6px 0">${swatch}${esc(value)}</td></tr>`;
  };
  const kind = f.type === 'project' ? 'project' : 'job';

  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:14px;color:#171717">
<p>New ${kind} inquiry <b>${esc(ref)}</b> from <b>${esc(f.name)}</b>. Hit Reply to answer them.</p>
<table style="border-collapse:collapse">${filled.map(([l, v]) => cell(l, v!)).join('')}</table>
<p style="margin-top:16px;color:#666">Message</p>
<p style="white-space:pre-wrap">${esc(f.message)}</p>
${files.length ? `<p style="margin-top:16px;color:#666">Attached images</p><ul>${files.map((x) => `<li>${esc(x.filename)}${x.caption ? ` - ${esc(x.caption)}` : ''}</li>`).join('')}</ul>` : ''}
</div>`;

  const text = [
    `New ${kind} inquiry ${ref}`,
    ...filled.map(([l, v]) => `${l}: ${v}`),
    '',
    'Message:',
    f.message,
    ...(files.length ? ['', 'Attached images:', ...files.map((x) => `${x.filename}${x.caption ? ` - ${x.caption}` : ''}`)] : []),
  ].join('\n');

  return {
    subject: `New ${kind} inquiry - ${ref}`,
    replyTo: f.email,
    html,
    text,
    attachments: files.map((x) => ({ filename: x.filename, content: Buffer.from(x.img.bytes), contentType: x.img.type })),
  };
}
