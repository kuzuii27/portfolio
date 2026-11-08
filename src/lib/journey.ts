// Scroll progress API: 0 (top of page) to 1 (bottom). Only ScrollJourney writes it.

export function clampProgress(p: number): number {
  return Math.min(1, Math.max(0, p));
}

// Progress for a 0..1 scale split into N equal segments; returns the planet index the robot is nearest to.
export function nearestPlanetIndex(p: number, count: number): number {
  if (count <= 1) return 0;
  return Math.round(clampProgress(p) * (count - 1));
}

// Progress value that lands the robot on planet `index`.
export function progressForPlanet(index: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(1, Math.max(0, index / (count - 1)));
}
