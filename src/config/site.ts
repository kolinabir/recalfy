/**
 * Where the website lives, for the sentences the bot says out loud.
 *
 * Read from the process environment at call time rather than through `Env`,
 * because most callers are module-level copy — a paywall notice, a tool's
 * refusal — with no injector to hand them one. ConfigModule has populated
 * `process.env` from `.env` before anything here can run.
 *
 * `WEB_URL` unset means recalfy.com on the hosted build, and no website at all
 * on a self-hosted one: most installs run the bot alone, and a link to a
 * dashboard that does not exist is worse than no link.
 */

const HOSTED_WEB_URL = 'https://recalfy.com';

function selfHosted(): boolean {
  return process.env.RECALFY_MODE?.trim().toLowerCase() === 'selfhost';
}

/** The website's origin, or null when this install has none. */
export function webOrigin(): string | null {
  const configured = process.env.WEB_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  return selfHosted() ? null : HOSTED_WEB_URL;
}

/**
 * `recalfy.com/dashboard/billing` — the form people read in a chat message,
 * without the scheme. Null when there is no website to point at.
 */
export function siteLink(path = ''): string | null {
  const origin = webOrigin();
  if (!origin) return null;
  return `${origin.replace(/^https?:\/\//, '')}${path}`;
}

export function isSelfHosted(): boolean {
  return selfHosted();
}
