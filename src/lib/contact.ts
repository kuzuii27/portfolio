/** Digits only, country code first. 0992... local PH format becomes 63992... */
export const toInternational = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  return d.startsWith('0') ? `63${d.slice(1)}` : d;
};

export const CONTACT_NUMBER = toInternational(process.env.NEXT_PUBLIC_CONTACT_NUMBER ?? '09929469627');

export const whatsappUrl = (n: string) => (n ? `https://wa.me/${n}` : null);
export const viberUrl = (n: string) => (n ? `viber://chat?number=%2B${n}` : null);
