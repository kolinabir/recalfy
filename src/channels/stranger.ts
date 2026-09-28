import { siteLink } from '../config/site';
import { Channel } from '../mongo/collections';

/**
 * What the bot says to someone it has never met.
 *
 * Silence is the wrong answer here and always was. Somebody who found the bot
 * before the website — from a link, a search, a friend — types "hi", gets
 * nothing back, and reasonably concludes it is broken. They cannot be
 * identified, so there is nothing to personalise and nothing to leak: one
 * fixed paragraph, the same for everyone, saying what this is and where to
 * start.
 *
 * It is not a sales pitch. Someone who has just been ignored wants to know
 * whether the thing works, in what order to do two steps, and what it costs.
 */

const OPENING =
  "I'm Recalfy — a memory that lives in this chat. Tell me something once and I'll still have it months from now.";

const MANUAL_FALLBACK: Record<Channel, string> = {
  telegram: "If the link won't open on this device, send /code here and type the code into the site instead.",
  whatsapp: 'If the link won\'t open on this device, send "code" here and type the code into the site instead.',
};

const CONNECT_BUTTON: Record<Channel, string> = {
  telegram: 'Connect Telegram',
  whatsapp: 'Connect WhatsApp',
};

export function strangerWelcome(channel: Channel): string {
  const login = siteLink('/login');

  // A self-hosted bot with no website belongs to one person, and there is no
  // door to point anyone else at. Said once, plainly, with nothing to try.
  if (!login) {
    return "I'm a private Recalfy bot, and I only talk to the person who runs me.";
  }

  return [
    OPENING,
    'This chat is not connected to an account yet:',
    `1. Sign in at ${login}\n2. Press "${CONNECT_BUTTON[channel]}"`,
    MANUAL_FALLBACK[channel],
    'Seven days free, nothing to install.',
  ].join('\n\n');
}
