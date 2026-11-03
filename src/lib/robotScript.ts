// What the robot guide says and does in each section. 'top' is the hero.

export type Pose = 'stand' | 'nap' | 'type' | 'wave' | 'point' | 'present' | 'think' | 'thumbs';

export const SECTION_IDS = ['top', 'work', 'levels', 'skills', 'about', 'contact'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const GUIDE: Record<SectionId, { pose: Pose; intro: string; again: string }> = {
  top: { pose: 'wave', intro: 'Hi! I\u2019m Kuzuii\u2019s helper bot. Scroll down and I\u2019ll show you around.', again: 'Welcome back to the top!' },
  work: { pose: 'point', intro: 'These are real projects. Tap one to read the full story.', again: 'Back to the projects!' },
  levels: { pose: 'present', intro: 'Not sure what you need? Compare three website levels side by side.', again: 'Three levels, one for every budget.' },
  skills: { pose: 'think', intro: 'Strong on the backend, and always learning the rest.', again: 'Still learning, every project.' },
  about: { pose: 'thumbs', intro: 'Here\u2019s the human behind the code.', again: 'That\u2019s Kuzuii!' },
  contact: { pose: 'wave', intro: 'Send a message. It goes straight to Kuzuii\u2019s inbox.', again: 'Say hi anytime!' },
};

/** First visit to a section gets its intro and pose; later visits get a short wave. Marks the section as seen. */
export function lineFor(id: string, seen: Set<string>): { pose: Pose; text: string } | null {
  if (!(id in GUIDE)) return null;
  const g = GUIDE[id as SectionId];
  if (seen.has(id)) return { pose: 'wave', text: g.again };
  seen.add(id);
  return { pose: g.pose, text: g.intro };
}
