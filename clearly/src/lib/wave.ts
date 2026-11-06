/** Height of the wave crests above and below the water line, in pixels. */
export const WAVE_AMPLITUDE = 6;

/** SVG path for a gentle sine-wave surface across the width, filled down to the bottom. */
export function wavePath(width: number, height: number, phase: number, wavelength: number): string {
  const xs: number[] = [];
  for (let x = 0; x < width; x += 8) xs.push(x);
  xs.push(width); // always finish exactly at the right edge
  const points = xs.map((x, i) => {
    const y = WAVE_AMPLITUDE + WAVE_AMPLITUDE * Math.sin((2 * Math.PI * x) / wavelength + phase);
    return `${i === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
  });
  points.push(`L${width} ${height}`, `L0 ${height}`, 'Z');
  return points.join(' ');
}
