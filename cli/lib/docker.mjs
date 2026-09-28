import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { COMPOSE_FILE, HOME, IMAGE } from './paths.mjs';

/** What is missing, as a sentence a person can act on, or null if nothing is. */
export function dockerProblem() {
  const version = spawnSync('docker', ['--version'], { encoding: 'utf8' });
  if (version.error || version.status !== 0) {
    return process.platform === 'linux'
      ? 'Docker is not installed. Install it with:\n  curl -fsSL https://get.docker.com | sh'
      : 'Docker is not installed. Install Docker Desktop (https://docker.com/products/docker-desktop) or OrbStack (https://orbstack.dev), open it, and run this again.';
  }

  const info = spawnSync('docker', ['info'], { encoding: 'utf8' });
  if (info.status !== 0) {
    if (/permission denied/i.test(info.stderr)) {
      return 'Docker is installed but this user cannot use it. Run:\n  sudo usermod -aG docker $USER\nthen log out and back in.';
    }
    return 'Docker is installed but not running. Start Docker Desktop (or `sudo systemctl start docker`) and try again.';
  }

  const compose = spawnSync('docker', ['compose', 'version'], { encoding: 'utf8' });
  if (compose.status !== 0) {
    return 'Docker Compose v2 is missing. Update Docker, or install the compose plugin.';
  }
  return null;
}

/**
 * The stack an install runs. Written on every setup, so an update to the CLI
 * can change it; the .env next to it is the part that belongs to the person.
 */
export function writeCompose() {
  writeFileSync(
    COMPOSE_FILE,
    `# Written by \`recalfy setup\` — regenerated on every setup, so edit .env instead.
name: recalfy

services:
  bot:
    image: ${IMAGE}
    restart: unless-stopped
    env_file: .env
    environment:
      RECALFY_MODE: selfhost
      MONGODB_URI: mongodb://mongo:27017
      MONGODB_DB: recalfy
    extra_hosts:
      # Lets LLM_BASE_URL point at Ollama on this machine on Linux, as it
      # already can on Docker Desktop.
      - host.docker.internal:host-gateway
    depends_on:
      mongo:
        condition: service_healthy
    logging:
      driver: json-file
      options: { max-size: 10m, max-file: '3' }

  mongo:
    image: mongo:8
    restart: unless-stopped
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ['CMD', 'mongosh', '--quiet', '--eval', 'db.adminCommand("ping")']
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  mongo-data:
`,
  );
}

function args(rest) {
  return ['compose', '-f', COMPOSE_FILE, '--project-directory', HOME, ...rest];
}

/** Runs `docker compose …` with its output shown. Resolves to the exit code. */
export function compose(rest, { quiet = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn('docker', args(rest), { stdio: quiet ? 'ignore' : 'inherit' });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

/** Runs `docker compose …` and captures stdout, for commands whose output is data. */
export function composeCapture(rest, { input, binary = false } = {}) {
  return spawnSync('docker', args(rest), {
    // Binary for database dumps: decoding gzip bytes as text corrupts them.
    encoding: binary ? 'buffer' : 'utf8',
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
}

export function imageIsLocal(image) {
  return spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' }).status === 0;
}

/** The bot container's health, as Docker reports it, or null if it is not running. */
export function botHealth() {
  const result = composeCapture(['ps', '--format', '{{.Service}} {{.State}} {{.Health}}']);
  const line = result.stdout?.split('\n').find((row) => row.startsWith('bot '));
  if (!line) return null;
  const [, state, health] = line.split(' ');
  return health || state;
}
