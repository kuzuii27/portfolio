// The three website levels offered to clients. Shared by the form, validation, email and the Levels section.

export type Level = 'minimum' | 'standard' | 'high';

export const LEVELS: readonly { id: Level; label: string; term: string; meaning: string; demo: string }[] = [
  {
    id: 'minimum',
    label: 'Minimum',
    term: 'MVP (Minimum Viable Product)',
    meaning: 'A basic, functional site built quickly to test an idea or secure an online presence. It has just enough features to be usable.',
    demo: '/demos/minimum/',
  },
  {
    id: 'standard',
    label: 'Standard',
    term: 'Production-ready / Standard build',
    meaning: 'A professional, fully optimized business site. It is secure, responsive (looks good on mobile), and built for regular traffic.',
    demo: '/demos/standard/',
  },
  {
    id: 'high',
    label: 'High quality',
    term: 'Enterprise-grade / Premium build',
    meaning: 'A highly scalable, lightning-fast, custom-designed digital experience. It features top-tier security, deep integrations, and advanced animations.',
    demo: '/demos/high/',
  },
];

export const isLevel = (v: unknown): v is Level => LEVELS.some((l) => l.id === v);
