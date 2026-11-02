// Inquiry validation shared by the form (pre-check) and /api/inquiry (source of truth).

import { isLevel, type Level } from '@/lib/levels';

export type InquiryType = 'project' | 'job';

export interface InquiryFields {
  type: InquiryType;
  name: string;
  email: string;
  phone?: string;
  preferredContact: 'email' | 'phone' | 'viber';
  message: string;
  consent: boolean;
  website: string; // honeypot: humans never see it
  startedAt: number; // ms timestamp when the form was opened
  projectType?: string;
  level?: Level;
  timeline?: string;
  color?: string;
  font?: 'modern' | 'classic' | 'friendly' | 'technical' | 'none';
  captions?: string[];
  company?: string;
  role?: string;
  employmentType?: string;
  workSetup?: string;
  salary?: string;
}

export interface ImageFile { name: string; type: string; bytes: Uint8Array }

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export const LIMITS = { maxImages: 3, maxTotalBytes: 4 * 1024 * 1024, minMs: 3000, msgMin: 20, msgMax: 5000, nameMax: 100 };

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PH_MOBILE = /^09\d{9}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const hasLineBreak = (s?: string) => !!s && /[\r\n]/.test(s);

export function isRealImage(img: ImageFile): boolean {
  const b = img.bytes;
  const at = (i: number, sig: number[]) => sig.every((v, j) => b[i + j] === v);
  if (img.type === 'image/jpeg') return at(0, [0xff, 0xd8, 0xff]);
  if (img.type === 'image/png') return at(0, [0x89, 0x50, 0x4e, 0x47]);
  if (img.type === 'image/webp') return at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50]);
  return false;
}

export function validateInquiry(f: InquiryFields, images: ImageFile[], now: number): Result<InquiryFields> {
  const errors: Record<string, string> = {};
  const t = (s?: unknown) => (typeof s === 'string' ? s.trim() : '');
  const v: InquiryFields = {
    ...f, name: t(f.name), email: t(f.email), message: t(f.message), phone: t(f.phone) || undefined,
    captions: Array.isArray(f.captions) ? f.captions.slice(0, LIMITS.maxImages).map((c) => t(c).slice(0, 200)) : undefined,
  };

  if (!v.name || v.name.length > LIMITS.nameMax || hasLineBreak(f.name)) errors.name = 'Enter your name.';
  if (!EMAIL.test(v.email) || hasLineBreak(f.email)) errors.email = 'Enter a valid email address.';
  if (v.message.length < LIMITS.msgMin || v.message.length > LIMITS.msgMax)
    errors.message = `Write between ${LIMITS.msgMin} and ${LIMITS.msgMax} characters.`;
  if (v.phone && !PH_MOBILE.test(v.phone.replace(/[\s-]/g, ''))) errors.phone = 'Use the format 09XX XXX XXXX.';
  if ((v.preferredContact === 'phone' || v.preferredContact === 'viber') && !v.phone)
    errors.phone = 'Add a phone number so I can reach you that way.';
  if (!v.consent) errors.consent = 'Please agree so I can reply to you.';
  if (t(f.website) || now - f.startedAt < LIMITS.minMs) errors.spam = 'Your message looks automated. Please try again.';

  if (v.type === 'project') {
    if (!t(v.projectType)) errors.projectType = 'Choose a project type.';
    if (!isLevel(v.level)) errors.level = 'Choose a level.';
    if (!t(v.timeline)) errors.timeline = 'Choose a timeline.';
    if (v.color && !HEX.test(v.color)) errors.color = 'Pick a colour from the list.';
  } else if (v.type === 'job') {
    if (!t(v.company) || hasLineBreak(v.company)) errors.company = 'Enter the company name.';
    if (!t(v.role) || hasLineBreak(v.role)) errors.role = 'Enter the role title.';
    if (!t(v.employmentType)) errors.employmentType = 'Choose an employment type.';
    if (!t(v.workSetup)) errors.workSetup = 'Choose a work setup.';
  } else {
    errors.type = 'Choose project or job.';
  }

  const total = images.reduce((n, i) => n + i.bytes.length, 0);
  if (images.length > LIMITS.maxImages) errors.images = `Up to ${LIMITS.maxImages} images.`;
  else if (total > LIMITS.maxTotalBytes) errors.images = 'Images must be under 4 MB in total.';
  else if (images.some((i) => !IMAGE_TYPES.includes(i.type) || !isRealImage(i))) errors.images = 'Only JPEG, PNG or WebP images.';

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: v };
}

const REF_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function makeRef(now: Date, rand: () => number = Math.random): string {
  const d = now.toISOString().slice(0, 10).replaceAll('-', '');
  const tail = Array.from({ length: 4 }, () => REF_CHARS[Math.floor(rand() * REF_CHARS.length)]).join('');
  return `INQ-${d}-${tail}`;
}
