/**
 * Argument readers for tool calls.
 *
 * Everything here comes from a language model, so nothing is assumed: a
 * missing or mistyped field raises a message the model can read and correct
 * on the next turn, rather than throwing an exception at the user.
 */
export class BadArguments extends Error {}

export function asObject(args: unknown): Record<string, unknown> {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new BadArguments('Arguments must be a JSON object.');
  }
  return args as Record<string, unknown>;
}

export function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadArguments(`"${key}" must be a non-empty string.`);
  }
  return value.trim();
}

export function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new BadArguments(`"${key}" must be a string.`);
  return value.trim() || undefined;
}

export function optionalPositiveInteger(
  args: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new BadArguments(`"${key}" must be a positive integer.`);
  }
  return value;
}

/** Positive and finite, decimals welcome — 2.5 litres is a real amount. */
export function optionalPositiveNumber(
  args: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BadArguments(`"${key}" must be a positive number.`);
  }
  return value;
}

export function optionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw new BadArguments(`"${key}" must be true or false.`);
  return value;
}

export function requireStringArray(args: Record<string, unknown>, key: string): string[] {
  const value = args[key];
  if (!Array.isArray(value)) throw new BadArguments(`"${key}" must be an array.`);

  const strings = value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  if (strings.length === 0) throw new BadArguments(`"${key}" must contain at least one value.`);
  return strings.map((item) => item.trim());
}

export function optionalStringArray(args: Record<string, unknown>, key: string): string[] | undefined {
  if (args[key] === undefined || args[key] === null) return undefined;
  return requireStringArray(args, key);
}

export function requireObjectArray(
  args: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  const value = args[key];
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadArguments(`"${key}" must be a non-empty array.`);
  }
  return value.map(asObject);
}
