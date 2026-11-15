// Shared between the loader variants: the lifecycle phases.
export type Phase = 'travel' | 'launch' | 'gone';

// Timing shared by both loaders (ms).
export const TRAVEL_MS = 1900; // hover and flicker
export const LAUNCH_MS = 650;  // anticipation + exit (<= 700ms)
export const TOTAL_MS = TRAVEL_MS + LAUNCH_MS;
export const REPEAT_MS = 300;  // repeat visit in the same session: short skip, no launch
export const REDUCED_MS = 250; // reduced motion: plain fade
export const SESSION_KEY = 'kuzuii-loader-seen';

/** Fired once when the loader's exit begins (or immediately on a skip path). The page robot flies in on it. */
export const LOADER_DONE = 'loader:done';
