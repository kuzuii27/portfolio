// The three website levels offered to clients. Shared by the form, validation, email and the Levels section.

export type Level = 'minimum' | 'standard' | 'high';

export const LEVELS: readonly { id: Level; label: string; term: string; meaning: string; demo: string; full: readonly string[] }[] = [
  {
    id: 'minimum',
    label: 'Minimum',
    term: 'MVP (Minimum Viable Product)',
    meaning: 'A basic, functional site built quickly to test an idea or secure an online presence. It has just enough features to be usable.',
    demo: '/demos/minimum/index.html',
    full: [
      'Domain and hosting set up',
      'One mobile-friendly page with your real details and photos',
      'Call, Viber and Messenger buttons',
      'Basic Google search setup',
      'No admin portal: I make text and price changes for you',
    ],
  },
  {
    id: 'standard',
    label: 'Standard',
    term: 'Production-ready / Standard build',
    meaning: 'A professional, fully optimized business site. It is secure, responsive (looks good on mobile), and built for regular traffic.',
    demo: '/demos/standard/index.html',
    full: [
      'Everything in Minimum, on 4-5 pages',
      'Admin portal to edit pages, prices and photos',
      'Inquiry form that emails you, with spam protection',
      'Google Business Profile, Maps and visitor stats',
      'Secure HTTPS, backups and a short how-to for your staff',
    ],
  },
  {
    id: 'high',
    label: 'High quality',
    term: 'Enterprise-grade / Premium build',
    meaning: 'A highly scalable, lightning-fast, custom-designed digital experience. It features top-tier security, deep integrations, and advanced animations.',
    demo: '/demos/high/index.html',
    full: [
      'Everything in Standard',
      'Booking calendar in the admin portal: confirm, move or cancel visits, block dates',
      'Online deposits with Maya, confirmed automatically by webhook',
      'Customer list and booking history',
      'Staff logins with roles (owner, front desk, dentist)',
      'Chatbot answers you can edit, plus an inbox for handed-off questions',
      'Email or Viber alerts for new bookings and messages',
      'Reports, speed tuning and security hardening',
    ],
  },
];

export const isLevel = (v: unknown): v is Level => LEVELS.some((l) => l.id === v);
