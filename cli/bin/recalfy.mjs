#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { botHealth, compose, composeCapture, dockerProblem, writeCompose } from '../lib/docker.mjs';
import { BACKUP_DIR, ENV_FILE, HOME } from '../lib/paths.mjs';
import { setup } from '../lib/setup.mjs';

const HELP = `recalfy — your own AI memory in Telegram

  npx recalfy              set it up (or run setup again)
  npx recalfy status       is it running?
  npx recalfy logs         follow what it is doing (Ctrl+C to stop)
  npx recalfy start        start it
  npx recalfy stop         stop it, keeping everything
  npx recalfy restart      restart it (after editing .env)
  npx recalfy update       download the newest version and restart
  npx recalfy backup       save the whole database to ${BACKUP_DIR}
  npx recalfy restore <f>  put a backup back (replaces what is there)
  npx recalfy export       your memory as Markdown   (--json for everything, -o file)
  npx recalfy uninstall    stop and remove it        (--delete-data to erase memory too)

Settings live in ${ENV_FILE}.`;

const [command = 'setup', ...rest] = process.argv.slice(2);

function needsInstall() {
  if (!existsSync(ENV_FILE)) {
    console.error('Recalfy is not set up yet. Run `npx recalfy` first.');
    process.exit(1);
  }
  const problem = dockerProblem();
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  // Refreshed every time, so an updated CLI brings its compose changes along.
  writeCompose();
}

function option(name) {
  const index = rest.indexOf(name);
  return index === -1 ? undefined : rest[index + 1];
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

const commands = {
  setup,

  async status() {
    needsInstall();
    const health = botHealth();
    const line = {
      healthy: '● running',
      starting: '◌ starting',
      unhealthy: '✗ running but unhealthy — `npx recalfy logs` shows why',
    }[health] ?? `○ not running${health ? ` (${health})` : ''} — \`npx recalfy start\``;
    console.log(line);
    process.exit(health === 'healthy' ? 0 : 1);
  },

  async logs() {
    needsInstall();
    process.exit(await compose(['logs', '--follow', '--tail', '200', 'bot']));
  },

  async start() {
    needsInstall();
    process.exit(await compose(['up', '-d', '--remove-orphans']));
  },

  async stop() {
    needsInstall();
    process.exit(await compose(['stop']));
  },

  async restart() {
    needsInstall();
    // `up` rather than `restart`, so edits to .env are actually picked up.
    process.exit(await compose(['up', '-d', '--force-recreate', 'bot']));
  },

  async update() {
    needsInstall();
    console.log('Downloading the newest version…');
    if ((await compose(['pull'])) !== 0) process.exit(1);
    process.exit(await compose(['up', '-d', '--remove-orphans']));
  },

  async backup() {
    needsInstall();
    mkdirSync(BACKUP_DIR, { recursive: true });
    const file = option('-o') ?? join(BACKUP_DIR, `recalfy-${stamp()}.archive.gz`);
    const result = composeCapture(
      ['exec', '-T', 'mongo', 'mongodump', '--db=recalfy', '--archive', '--gzip', '--quiet'],
      { binary: true },
    );
    if (result.status !== 0 || !result.stdout?.length) {
      console.error(`Backup failed. ${result.stderr?.toString() ?? ''}`.trim());
      process.exit(1);
    }
    writeFileSync(resolve(file), result.stdout, { mode: 0o600 });
    console.log(`Saved ${file}`);
  },

  async restore() {
    needsInstall();
    const file = rest[0];
    if (!file || !existsSync(file)) {
      console.error('Usage: npx recalfy restore <backup file>');
      process.exit(1);
    }
    const result = composeCapture(
      ['exec', '-T', 'mongo', 'mongorestore', '--archive', '--gzip', '--drop', '--nsInclude=recalfy.*', '--quiet'],
      { input: readFileSync(file), binary: true },
    );
    if (result.status !== 0) {
      console.error(`Restore failed. ${result.stderr?.toString() ?? ''}`.trim());
      process.exit(1);
    }
    await compose(['restart', 'bot'], { quiet: true });
    console.log(`Restored ${file}`);
  },

  async export() {
    needsInstall();
    const json = rest.includes('--json');
    const result = composeCapture(['exec', '-T', 'bot', 'node', 'dist/cli/export.js', ...(json ? ['--json'] : [])]);
    if (result.status !== 0) {
      console.error((result.stderr || 'Export failed — is it running? `npx recalfy start`').trim());
      process.exit(1);
    }
    const out = option('-o');
    if (out) {
      writeFileSync(resolve(out), result.stdout, { mode: 0o600 });
      console.log(`Saved ${out}`);
    } else {
      process.stdout.write(result.stdout);
    }
  },

  async uninstall() {
    needsInstall();
    const wipe = rest.includes('--delete-data');
    process.exitCode = await compose(['down', ...(wipe ? ['--volumes'] : [])]);
    console.log(
      wipe
        ? `Removed, memory included. Your settings are still in ${HOME} — delete that folder to finish.`
        : 'Stopped and removed. Your memory is kept; `npx recalfy start` brings it back.',
    );
  },

  help() {
    console.log(HELP);
  },
};
commands['--help'] = commands['-h'] = commands.help;

const run = commands[command];
if (!run) {
  console.error(`Unknown command "${command}".\n\n${HELP}`);
  process.exit(1);
}
await run();
