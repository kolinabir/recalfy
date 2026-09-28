import { homedir } from 'node:os';
import { join } from 'node:path';

/** Everything an install owns lives here: .env, compose.yml, backups. */
export const HOME = process.env.RECALFY_HOME || join(homedir(), '.recalfy');
export const ENV_FILE = join(HOME, '.env');
export const COMPOSE_FILE = join(HOME, 'compose.yml');
export const BACKUP_DIR = join(HOME, 'backups');

/** Overridable so an unreleased build can be tried: RECALFY_IMAGE=recalfy:dev. */
export const IMAGE = process.env.RECALFY_IMAGE || 'ghcr.io/kolinabir/recalfy:latest';
