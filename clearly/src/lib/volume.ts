/**
 * Pool volume from dimensions, for owners who don't know their volume.
 * All dimensions in metres. Result in litres, rounded to the nearest 100 L.
 */
export type PoolShape = 'rectangle' | 'round' | 'oval';

export interface Dimensions {
  /** Rectangle and oval: length. Round: diameter. */
  length: number;
  /** Rectangle and oval only. */
  width?: number;
  shallowDepth: number;
  /** Leave out for a flat-bottomed pool. */
  deepDepth?: number;
}

export function averageDepth(d: Dimensions): number {
  return d.deepDepth === undefined ? d.shallowDepth : (d.shallowDepth + d.deepDepth) / 2;
}

export function surfaceArea(shape: PoolShape, d: Dimensions): number {
  switch (shape) {
    case 'rectangle':
      return d.length * (d.width ?? 0);
    case 'round':
      return Math.PI * (d.length / 2) ** 2;
    case 'oval':
      return Math.PI * (d.length / 2) * ((d.width ?? 0) / 2);
  }
}

/** Litres, rounded to the nearest 100. Returns 0 for missing or invalid dimensions. */
export function poolVolumeLitres(shape: PoolShape, d: Dimensions): number {
  const values = [d.length, d.shallowDepth, d.deepDepth ?? d.shallowDepth];
  if (shape !== 'round') values.push(d.width ?? Number.NaN);
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return 0;
  const litres = surfaceArea(shape, d) * averageDepth(d) * 1000;
  return Math.round(litres / 100) * 100;
}
