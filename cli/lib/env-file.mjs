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
 * Single quotes are the one form Docker Compose reads literally — no `$`
 * interpolation, no `#` comment — which is what an API key needs. Plain values
 * stay bare so the file is still pleasant to edit.
 */
function quote(value) {
  if (/^[A-Za-z0-9_./:@+,=-]*$/.test(value)) return value;
  return `'${value.replace(/'/g, '')}'`;
}

/**
 * Writes the .env with a short header, readable only by its owner: it holds
 * the bot token and the model key, and nothing else on the machine needs them.
 */
export function writeEnv(path, values) {
  const lines = [
    '# Written by `npx recalfy`. Edit freely, then run `npx recalfy restart`.',
    '',
    ...Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${quote(String(value))}`),
    '',
  ];
  writeFileSync(path, lines.join('\n'), { mode: 0o600 });
  chmodSync(path, 0o600);
}
