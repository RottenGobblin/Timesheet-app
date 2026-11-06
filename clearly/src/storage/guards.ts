export function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function num(x: unknown): number | undefined {
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
}

export function oneOf<T extends string>(x: unknown, options: readonly T[]): T | undefined {
  return typeof x === 'string' && (options as readonly string[]).includes(x) ? (x as T) : undefined;
}
