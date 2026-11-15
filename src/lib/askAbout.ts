/** Scroll to the contact form; MessageForm listens for the event and starts the message with the chosen system. */
export function askAbout(topic: string) {
  window.dispatchEvent(new CustomEvent('contact:topic', { detail: topic }));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('contact')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}
