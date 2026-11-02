'use client';

import { useEffect, useRef, useState } from 'react';
import { LIMITS, validateInquiry, type InquiryFields, type InquiryType } from '@/lib/inquiry';

type Font = NonNullable<InquiryFields['font']>;
type Contact = InquiryFields['preferredContact'];
interface Img { id: number; name: string; orig: number; blob: Blob; kept: boolean; url: string; caption: string }

const MAX_IN = 5 * 1048576;
const SWATCHES = [['#171717', 'Black'], ['#0072f5', 'Blue'], ['#0d9488', 'Teal'], ['#7928ca', 'Purple'], ['#de1d8d', 'Pink'], ['#ea580c', 'Orange']];
const FONTS: Record<Font, { label: string; stack: string; sample: string; note: string }> = {
  modern: { label: 'Modern', stack: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif', sample: 'Hello', note: 'System sans' },
  classic: { label: 'Classic', stack: 'Georgia,"Times New Roman",serif', sample: 'Hello', note: 'Serif' },
  friendly: { label: 'Friendly', stack: 'ui-rounded,"Segoe UI",sans-serif', sample: 'Hello', note: 'Rounded' },
  technical: { label: 'Technical', stack: 'ui-monospace,SFMono-Regular,Consolas,monospace', sample: 'Hello', note: 'Monospace' },
  none: { label: 'No preference', stack: 'var(--sans)', sample: 'Aa', note: "I'll suggest one" },
};
// Field order = focus order for the first error.
const ORDER = ['name', 'email', 'projectType', 'budget', 'timeline', 'company', 'role', 'employmentType', 'workSetup', 'message', 'images', 'color', 'phone', 'consent'];

const kb = (n: number) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const isHex = (c: string) => /^#[0-9a-f]{6}$/i.test(c);
const inkOn = (hex: string) => { // WCAG luminance; 0.199 = equal contrast point for #171717 vs white
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.199 ? '#171717' : '#ffffff';
};

async function compress(file: File): Promise<[Blob, boolean]> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // transparent PNGs would turn black as JPEG
  g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok([b, k < 1]) : no(new Error('encode'))), 'image/jpeg', 0.8));
}

/** ARIA radio group with roving tabindex and arrow keys. */
function Radios<T extends string>({ label, value, options, onChange, className, render }: {
  label: string; value: T; options: T[]; onChange: (v: T) => void; className: string;
  render: (v: T) => { content: React.ReactNode; className?: string; style?: React.CSSProperties; aria?: string };
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const key = (e: React.KeyboardEvent, i: number) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    onChange(options[n]); refs.current[n]?.focus();
  };
  return (
    <div className={className} role="radiogroup" aria-label={label}>
      {options.map((o, i) => {
        const r = render(o);
        return (
          <button key={o} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={value === o} aria-label={r.aria}
            tabIndex={value === o ? 0 : -1} className={r.className} style={r.style} onClick={() => onChange(o)} onKeyDown={(e) => key(e, i)}
            data-radio-group={label}>
            {r.content}
          </button>
        );
      })}
    </div>
  );
}

export function InquiryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef(0);
  const nextId = useRef(0);
  const queue = useRef(Promise.resolve());
  const imgsRef = useRef<Img[]>([]);
  const sending = useRef(false);
  const [type, setType] = useState<InquiryType>('project');
  const [contact, setContact] = useState<Contact>('email');
  const [color, setColor] = useState('none'); // 'none' | 'custom' | hex
  const [custom, setCustom] = useState('#0f766e');
  const [font, setFont] = useState<Font>('none');
  const [imgs, setImgs] = useState<Img[]>([]);
  const [fileErr, setFileErr] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ ref: string; name: string } | null>(null);
  const [count, setCount] = useState(0);

  const brand = color === 'custom' ? custom : isHex(color) ? color : '';
  useEffect(() => { startedAt.current = Date.now(); }, []);
  useEffect(() => { if (done) document.getElementById('ok-title')?.focus(); }, [done]);

  // Hero / nav buttons carry data-inquire="project|job": preselect the type.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-inquire]');
      if (!b) return;
      setType(b.dataset.inquire === 'job' ? 'job' : 'project');
      setDone(null);
      document.getElementById('nav-links')?.classList.remove('open');
      setTimeout(() => document.querySelector<HTMLElement>('[data-radio-group="What is this about?"][aria-checked="true"]')?.focus({ preventScroll: true }), 400);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Single source of truth for the image list: the async compression queue and the
  // remove/caption handlers all read and write imgsRef, so no one writes back a stale copy.
  const updateImgs = (fn: (list: Img[]) => Img[]) => { imgsRef.current = fn(imgsRef.current); setImgs(imgsRef.current); };

  const addImages = (list: File[]) => {
    queue.current = queue.current.then(async () => { // serialised so the 3-image limit holds across fast drops
      const errs: string[] = [];
      for (const f of list) {
        if (!f.type.startsWith('image/')) { errs.push(`"${f.name}" is not an image. Use JPG, PNG or WebP.`); continue; }
        if (imgsRef.current.length >= LIMITS.maxImages) { errs.push(`"${f.name}" was not added: the limit is 3 images.`); continue; }
        if (f.size > MAX_IN) { errs.push(`"${f.name}" is ${kb(f.size)}. The limit is 5 MB per image.`); continue; }
        let blob: Blob, resized: boolean;
        try { [blob, resized] = await compress(f); } catch { errs.push(`"${f.name}" could not be read as an image.`); continue; }
        const kept = !resized && f.size <= blob.size && ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);
        if (kept) blob = f;
        const cur = imgsRef.current; // re-read after the await: the visitor may have removed images meanwhile
        if (cur.length >= LIMITS.maxImages) { errs.push(`"${f.name}" was not added: the limit is 3 images.`); continue; }
        if (cur.reduce((t, i) => t + i.blob.size, 0) + blob.size > LIMITS.maxTotalBytes) { errs.push(`"${f.name}" would take the total over 4 MB.`); continue; }
        const img = { id: ++nextId.current, name: f.name, orig: f.size, blob, kept, url: URL.createObjectURL(blob), caption: '' };
        updateImgs((l) => [...l, img]);
      }
      setFileErr(errs.join(' '));
    });
  };
  const removeImg = (id: number) => {
    const img = imgsRef.current.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.url);
    updateImgs((l) => l.filter((i) => i.id !== id));
    setFileErr('');
    document.getElementById('pick')?.focus();
  };

  const collect = (): InquiryFields => {
    const fd = new FormData(formRef.current!);
    const s = (k: string) => String(fd.get(k) ?? '');
    return {
      type, name: s('name'), email: s('email'), phone: s('phone'), preferredContact: contact, message: s('message'),
      consent: fd.get('consent') === 'on', website: s('hp_x'), startedAt: startedAt.current,
      ...(type === 'project'
        ? { projectType: s('projectType'), budget: s('budget'), timeline: s('timeline'), color: brand || undefined, font, captions: imgs.map((i) => i.caption) }
        : { company: s('company'), role: s('role'), employmentType: s('employmentType'), workSetup: s('workSetup'), salary: s('salary') }),
    };
  };

  const showErrors = (errs: Record<string, string>) => {
    setErrors(errs);
    const first = ORDER.find((k) => errs[k]);
    const n = Object.keys(errs).filter((k) => k !== 'spam').length;
    setBanner(errs.spam ?? errs.form ?? (n ? `${n} ${n > 1 ? 'fields need' : 'field needs'} attention. Fix the highlighted ${n > 1 ? 'fields' : 'field'} and send again.` : ''));
    if (first) document.querySelector<HTMLElement>(first === 'images' ? '#pick' : `[name="${first}"]`)?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current) return; // ref, not state: a double-click fires both handlers before React re-renders
    const fields = collect();
    const check = validateInquiry(fields, [], Date.now());
    const local = check.ok ? {} : { ...check.errors };
    delete local.spam; // timing/honeypot are the server's call
    if (Object.keys(local).length) return showErrors(local);

    sending.current = true;
    setPending(true); setErrors({}); setBanner('');
    const fd = new FormData();
    fd.set('payload', JSON.stringify(fields));
    if (type === 'project') imgs.forEach((i, n) => fd.append('images', new File([i.blob], i.kept ? i.name : `image-${n + 1}.jpg`, { type: i.blob.type || 'image/jpeg' })));
    try {
      const res = await fetch('/api/inquiry', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone({ ref: body.ref, name: fields.name.trim().split(' ')[0] });
      } else if (res.status === 400 && body.errors) showErrors(body.errors);
      else setBanner(body.error ?? 'Could not send right now - please try again.');
    } catch {
      setBanner('Could not reach the server. Check your connection and try again.');
    } finally {
      sending.current = false;
      setPending(false);
    }
  };

  const reset = () => {
    imgs.forEach((i) => URL.revokeObjectURL(i.url));
    updateImgs(() => []); setErrors({}); setBanner(''); setFileErr(''); setColor('none'); setFont('none'); setContact('email'); setCount(0);
    startedAt.current = Date.now();
    setDone(null);
  };

  const err = (k: string) => (errors[k] ? <p className="err" id={`e-${k}`}>{errors[k]}</p> : <p className="err" id={`e-${k}`} />);
  const inv = (k: string) => ({ 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': `e-${k}` });
  const total = imgs.reduce((t, i) => t + i.blob.size, 0);

  if (done)
    return (
      <div className="success" role="status">
        <div className="tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
        <h3 id="ok-title" tabIndex={-1}>Thanks, {done.name} - your inquiry is in.</h3>
        <div className="ref"><span className="pill">Reference</span><code>{done.ref}</code></div>
        <p>It went straight to my email. I&apos;ll reply by {contact === 'viber' ? 'Viber' : contact}.</p>
        <div className="ctas"><button className="btn btn-ghost" type="button" onClick={reset}>Send another inquiry</button></div>
      </div>
    );

  return (
    <form ref={formRef} noValidate aria-labelledby="contact-title" onSubmit={submit}>
      <span className="label" id="type-label">What is this about?</span>
      <Radios label="What is this about?" className="seg" value={type} options={['project', 'job'] as InquiryType[]}
        onChange={(v) => { setType(v); setErrors({}); setBanner(''); }}
        render={(v) => ({ content: v === 'project' ? 'Project inquiry' : 'Job opportunity' })} />

      <div className="fields">
        <div className="field"><label htmlFor="f-name">Name</label><input id="f-name" name="name" autoComplete="name" maxLength={LIMITS.nameMax} {...inv('name')} />{err('name')}</div>
        <div className="field"><label htmlFor="f-email">Email</label><input id="f-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" {...inv('email')} />{err('email')}</div>

        {type === 'project' ? (
          <fieldset><legend className="sr">Project details</legend>
            <div className="field full"><label htmlFor="f-ptype">Project type</label>
              <div className="select"><select id="f-ptype" name="projectType" defaultValue="" {...inv('projectType')}>
                <option value="">Choose one</option>{['Website', 'Web app', 'Mobile app', 'Internal tool / automation', 'Other'].map((o) => <option key={o}>{o}</option>)}
              </select></div>{err('projectType')}</div>
            <div className="field"><label htmlFor="f-budget">Budget (PHP)</label>
              <div className="select"><select id="f-budget" name="budget" defaultValue="" {...inv('budget')}>
                <option value="">Choose a range</option>{['Below ₱20k', '₱20k-50k', '₱50k-150k', '₱150k+', 'Not sure yet'].map((o) => <option key={o}>{o}</option>)}
              </select></div>{err('budget')}</div>
            <div className="field"><label htmlFor="f-timeline">Timeline</label>
              <div className="select"><select id="f-timeline" name="timeline" defaultValue="" {...inv('timeline')}>
                <option value="">Choose one</option>{['ASAP', '1-3 months', '3+ months', 'Flexible'].map((o) => <option key={o}>{o}</option>)}
              </select></div>{err('timeline')}</div>
          </fieldset>
        ) : (
          <fieldset><legend className="sr">Job details</legend>
            <p className="resume-dl"><a className="btn btn-ghost" href="/Kuzui-Santillan-Resume.pdf" download>Download my resume (PDF)</a></p>
            <div className="field"><label htmlFor="f-company">Company</label><input id="f-company" name="company" autoComplete="organization" {...inv('company')} />{err('company')}</div>
            <div className="field"><label htmlFor="f-role">Role title</label><input id="f-role" name="role" placeholder="e.g. .NET Developer" {...inv('role')} />{err('role')}</div>
            <div className="field"><label htmlFor="f-emp">Employment type</label>
              <div className="select"><select id="f-emp" name="employmentType" defaultValue="" {...inv('employmentType')}>
                <option value="">Choose one</option>{['Full-time', 'Part-time', 'Contract'].map((o) => <option key={o}>{o}</option>)}
              </select></div>{err('employmentType')}</div>
            <div className="field"><label htmlFor="f-setup">Work setup</label>
              <div className="select"><select id="f-setup" name="workSetup" defaultValue="" {...inv('workSetup')}>
                <option value="">Choose one</option>{['Remote', 'Hybrid', 'On-site'].map((o) => <option key={o}>{o}</option>)}
              </select></div>{err('workSetup')}</div>
            <div className="field full"><label htmlFor="f-salary">Salary range <span className="opt">(optional)</span></label><input id="f-salary" name="salary" placeholder="e.g. monthly range in PHP" /></div>
          </fieldset>
        )}

        <div className="field full"><label htmlFor="f-message">Message</label>
          <textarea id="f-message" name="message" maxLength={LIMITS.msgMax} placeholder="What do you need, and what problem should it solve?"
            onChange={(e) => setCount(e.target.value.trim().length)} aria-invalid={errors.message ? true : undefined} aria-describedby="e-message h-message" />
          {err('message')}
          <p className="hint" id="h-message"><span>At least 20 characters</span><span className="mono">{count} / 20</span></p></div>

        {type === 'project' && (
          <fieldset><legend className="sr">Reference images and style</legend>
            <div className="field full"><span className="label">Reference images <span className="opt">(optional, up to 3)</span></span>
              <div className="drop" onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('over')}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); addImages([...e.dataTransfer.files]); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>
                <p>Drag screenshots or sites you like here, or</p>
                <button className="btn btn-ghost" type="button" id="pick" aria-describedby="img-rules e-images" onClick={() => document.getElementById('f-files')?.click()}>Choose images</button>
                <small id="img-rules">JPG, PNG or WebP, max 5 MB each. Resized to 1600px in your browser; 4 MB total.</small>
                <input type="file" id="f-files" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { addImages([...(e.target.files ?? [])]); e.target.value = ''; }} />
              </div>
              <p className="err" id="e-images" role="alert">{fileErr || errors.images}</p>
              {imgs.length > 0 && (
                <ul className="thumbs" aria-label="Attached images">
                  {imgs.map((i, n) => (
                    <li key={i.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                      <img src={i.url} alt={`Reference image ${n + 1}: ${i.name}`} />
                      <div className="t-info"><b>{i.name}</b><span className="mono">{kb(i.orig)} → {i.kept ? 'kept original (already small)' : `compressed to ${kb(i.blob.size)}`}</span>
                        <label className="sr" htmlFor={`cap-${i.id}`}>What image {n + 1} shows (optional)</label>
                        <input id={`cap-${i.id}`} maxLength={120} placeholder="What this shows" value={i.caption}
                          onChange={(e) => { const caption = e.target.value; updateImgs((l) => l.map((x) => (x.id === i.id ? { ...x, caption } : x))); }} /></div>
                      <button type="button" className="btn btn-ghost icon-btn" aria-label={`Remove ${i.name}`} onClick={() => removeImg(i.id)}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg></button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="hint"><span aria-live="polite">{imgs.length} of 3 images · {imgs.length ? kb(total) : '0 KB'} of 4 MB</span></p></div>

            <div className="field full"><span className="label">Brand colour <span className="opt">(optional)</span></span>
              <Radios label="Brand colour" className="swatches" value={color} options={[...SWATCHES.map(([h]) => h), 'custom', 'none']} onChange={setColor}
                render={(v) => v === 'none' ? { content: 'No preference', className: 'sw-none' }
                  : v === 'custom' ? { content: null, className: 'sw sw-custom', aria: 'Custom colour (set with the picker below)' }
                  : { content: null, className: 'sw', style: { '--sw': v } as React.CSSProperties, aria: `${SWATCHES.find(([h]) => h === v)![1]} ${v.toUpperCase()}` }} />
              <div className="color-row">
                {color === 'custom' && (<><label htmlFor="f-color">Custom colour</label>
                  <input type="color" id="f-color" value={custom} onChange={(e) => setCustom(e.target.value)} /></>)}
                <span>Selected:</span><output id="hex">{brand ? brand.toUpperCase() : 'No preference'}</output></div>
              {err('color')}</div>

            <div className="field full"><span className="label">Font style <span className="opt">(optional)</span></span>
              <Radios label="Font style" className="fonts" value={font} options={Object.keys(FONTS) as Font[]} onChange={setFont}
                render={(v) => ({ className: 'font-card', style: { '--ff': FONTS[v].stack } as React.CSSProperties,
                  content: <><span className="ff-sample" aria-hidden="true">{FONTS[v].sample}</span><span className="ff-name">{FONTS[v].label}</span><span className="ff-stack">{FONTS[v].note}</span></> })} /></div>

            <div className="field full"><span className="label" id="mock-label">Live preview</span>
              <div className="mock" role="img" aria-label={`Sample website header and button using ${brand ? 'colour ' + brand.toUpperCase() : 'the default colour'} and ${font === 'none' ? 'the default' : FONTS[font].label} font.`}
                style={{ '--mc': brand || 'var(--fg)', '--mi': brand ? inkOn(brand) : 'var(--bg)', '--mf': FONTS[font].stack } as React.CSSProperties}>
                <div className="mock-bar"><span className="mock-logo" />Your business<span className="mock-nav"><span>Services</span><span>About</span></span></div>
                <div className="mock-hero"><strong>A website that fits your brand</strong><span>This is how your colour and font choice could look.</span><span className="mock-btn">Get in touch</span></div>
              </div></div>
          </fieldset>
        )}

        <div className="field full"><span className="label">Preferred contact</span>
          <Radios label="Preferred contact" className="seg" value={contact} options={['email', 'phone', 'viber'] as Contact[]} onChange={setContact}
            render={(v) => ({ content: v === 'email' ? 'Email' : v === 'phone' ? 'Phone' : 'Viber' })} /></div>
        <div className="field full"><label htmlFor="f-phone">Phone <span className="opt">{contact === 'email' ? '(optional)' : `(required for ${contact === 'viber' ? 'Viber' : 'phone'})`}</span></label>
          <input id="f-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="09XX XXX XXXX" {...inv('phone')} />{err('phone')}</div>

        <div className="hp" aria-hidden="true">{/* honeypot: a name no browser autofills, so real visitors never trip it */}<label htmlFor="f-hp">Leave this empty</label><input id="f-hp" name="hp_x" tabIndex={-1} autoComplete="off" /></div>

        <div className="field full">
          <label className="consent" htmlFor="f-consent"><input id="f-consent" name="consent" type="checkbox" {...inv('consent')} />
            <span>I agree that my details{type === 'project' ? ' and images' : ''} are sent to Kuzuii&apos;s email so I can get a reply.</span></label>
          {err('consent')}
          <p className="hint"><span>Privacy (RA 10173): your inquiry goes only to my email, is used only to reply to you, and is deleted when no longer needed. Nothing is stored on this website.</span></p></div>
      </div>

      <div id="form-status" role="alert">{banner}{banner && !Object.keys(errors).length && (
        <> <button type="button" className="linkish" onClick={() => formRef.current?.requestSubmit()}>Try again</button></>)}</div>
      <div className="form-foot">
        <small>Sent to my email with any images attached.</small>
        <button className="btn btn-primary" type="submit" disabled={pending} aria-busy={pending}>
          {pending ? 'Sending...' : type === 'job' ? 'Send job inquiry' : 'Send project inquiry'}
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg></button>
      </div>
    </form>
  );
}
