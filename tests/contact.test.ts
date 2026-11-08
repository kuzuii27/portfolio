import { describe, expect, it } from 'vitest';
import { toInternational, viberUrl, whatsappUrl } from '@/lib/contact';

describe('contact links', () => {
  it('turns a local PH number into international digits', () => {
    expect(toInternational('09929469627')).toBe('639929469627');
    expect(toInternational('+63 992 946 9627')).toBe('639929469627');
    expect(viberUrl(toInternational('09929469627'))).toBe('viber://chat?number=%2B639929469627');
  });
  it('returns null for an empty number', () => {
    expect(whatsappUrl('')).toBeNull();
    expect(viberUrl('')).toBeNull();
  });
  it('builds the right URLs', () => {
    expect(whatsappUrl('15550001')).toBe('https://wa.me/15550001');
    expect(viberUrl('15550001')).toBe('viber://chat?number=%2B15550001');
  });
});
