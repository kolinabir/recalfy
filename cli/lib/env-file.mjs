import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

/** Reads a .env into a plain object. Comments and blank lines are skipped. */
export function readEnv(path) {
  if (!existsSync(path)) return {};
  const values = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

/**
 * Writes the .env with a short header, readable only by its owner: it holds
 * the bot token and the model key, and nothing else on the machine needs them.
 */
export function writeEnv(path, values) {
  const lines = [
    '# Written by `recalfy setup`. Edit freely, then run `recalfy restart`.',
    '',
    ...Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${value}`),
    '',
  ];
  writeFileSync(path, lines.join('\n'), { mode: 0o600 });
  chmodSync(path, 0o600);
}
