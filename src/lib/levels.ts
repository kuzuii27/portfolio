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
      'A one-page site or landing page with your real details and photos',
      'Contact buttons: call, Viber, Messenger or email',
      'Basic Google search setup',
      'Small text and photo updates done for you',
    ],
  },
  {
    id: 'standard',
    label: 'Standard',
    term: 'Production-ready / Standard build',
    meaning: 'A professional, fully optimized business site. It is secure, responsive (looks good on mobile), and built for regular traffic.',
    demo: '/demos/standard/index.html',
    full: [
      'Everything in Minimum, on several pages',
      'Admin portal to update your own content',
      'Forms that email you (inquiries, quotes, applications), with spam protection',
      'Google Business Profile, Maps and visitor stats',
      'Secure HTTPS, backups and a short how-to for your team',
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
      'Custom features built around your workflow',
      'Examples: bookings, orders, online payments (Maya), dashboards, chatbots',
      'Admin portal with staff logins and roles',
      'Customer records and history',
      'Email or Viber alerts and reports',
      'Integrations with the tools you already use',
      'Speed tuning and security hardening',
    ],
  },
];

export const isLevel = (v: unknown): v is Level => LEVELS.some((l) => l.id === v);
