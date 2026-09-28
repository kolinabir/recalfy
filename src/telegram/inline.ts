import type { InlineQueryResultArticle } from 'grammy/types';

import { isSelfHosted, siteLink } from '../config/site';
import { Memory } from '../memory/memory.types';
import { maskSecret } from './mask-secret';

/**
 * Turns matched facts into the list Telegram shows above the keyboard.
 *
 * The results are read-only text: whatever the person taps is sent as their
 * own message, exactly as it is stored. Nothing here can act on the account,
 * which is the point — an inline query is the one surface that answers without
 * the user being in a chat with us, so it is allowed to look and nothing else.
 */

/** Telegram truncates far longer than this, but a dropdown is not a document. */
const TITLE_LIMIT = 90;

/**
 * The mark drawn beside every result, in place of the grey letter tile
 * Telegram generates from the title.
 *
 * A fixed, absolute URL on purpose: Telegram fetches it from its own servers,
 * so a relative path or a localhost URL means no image at all, and it caches
 * per URL — a path that changes with each deploy would refetch the same image
 * forever. `www` because that is the canonical host; the apex redirects, and
 * a fetcher is not obliged to follow.
 */
const HOSTED_THUMBNAIL = 'https://www.recalfy.com/inline.png';
const THUMBNAIL_SIZE = 128;

/**
 * A self-hosted install with its own dashboard serves the same file; one
 * without a dashboard gets Telegram's letter tile rather than a request to
 * recalfy.com every time its owner types.
 */
function thumbnail() {
  const configured = process.env.WEB_URL?.trim().replace(/\/+$/, '');
  const url = configured ? `${configured}/inline.png` : isSelfHosted() ? null : HOSTED_THUMBNAIL;
  if (!url) return {};
  return { thumbnail_url: url, thumbnail_width: THUMBNAIL_SIZE, thumbnail_height: THUMBNAIL_SIZE };
}

/**
 * The two settings that keep one person's memory out of another person's
 * dropdown, exported so the adapter cannot answer without them and a test can
 * assert they are there.
 *
 * Telegram caches inline answers to make the panel feel instant, and by
 * default it assumes the answer to a given query is the same for everybody.
 * For a bot that returns *your* facts that default is a data leak: a second
 * person typing the same word could be served the first person's cached
 * results. `is_personal` scopes the cache to one user and `cache_time: 0`
 * says not to keep it at all.
 *
 * Both are invisible when they are missing. Everything works, in testing and
 * in normal use, right up until two people type the same word.
 */
export const PRIVATE_ANSWER = {
  cache_time: 0,
  is_personal: true,
} as const;

export function toInlineResults(memories: Memory[]): InlineQueryResultArticle[] {
  return memories.map((memory) => ({
    type: 'article',
    // The sid is unique per user and already short. Telegram caps ids at 64
    // bytes and only requires uniqueness within one answer.
    id: memory.sid,
    // Masked and then truncated, never the other way round: truncation must
    // not be what decides whether a password is on screen.
    title: truncate(maskSecret(memory.text), TITLE_LIMIT),
    description: memory.group,
    ...thumbnail(),
    input_message_content: {
      // Sent verbatim, with no parse_mode: a fact containing an underscore or
      // an asterisk would otherwise fail to send, or send half-formatted.
      //
      // Verbatim also means unmasked. The title above may hide a credential
      // from the room; tapping the result is a deliberate act, and a message
      // reading "the password is ••••••••" would help nobody.
      message_text: memory.text,
    },
  }));
}

/**
 * The strip above the results, and the only place Telegram lets a bot say
 * anything that is not a result.
 *
 * There is no read-only slot in an inline answer. A result is always tappable
 * and always sends its text, so "inline is off" cannot be a greyed-out row —
 * it would post that sentence into somebody else's chat. The button is the
 * whole vocabulary: it renders as one line above an empty list and opens a
 * private chat with the bot, which is where an explanation can actually be
 * read.
 *
 * Saying nothing is worse than saying it here. An empty answer with no button
 * is indistinguishable from a broken bot — the panel spins, shows nothing, and
 * the person retypes it twice.
 */
export const INLINE_REFUSALS = {
  unlinked: {
    text: 'Connect your account to search your memory here',
    start_parameter: 'inline',
    /**
     * What the bot says when the button is tapped and the chat opens. Getters,
     * so the link is read from the environment when it is said.
     */
    get reply() {
      const site = siteLink();
      if (!site) return "This is a private Recalfy bot, and this Telegram account isn't its owner.";
      return (
        "This chat isn't connected yet, so there is nothing to search.\n\n" +
        `Sign in at ${site} and press "Connect Telegram", then try searching from any chat again.`
      );
    },
  },
  lapsed: {
    text: 'Your plan has expired — tap to fix it',
    start_parameter: 'inline-plan',
    get reply() {
      return (
        'Your plan has expired, so inline results are empty for now.\n\n' +
        `${siteLink('/dashboard/billing') ?? 'The billing page'} has the details. ` +
        'Nothing has been deleted — your memory is waiting.'
      );
    },
  },
  off: {
    text: 'Inline results are turned off for your account',
    start_parameter: 'inline-off',
    get reply() {
      const settings = siteLink('/dashboard/settings');
      return (
        'Inline results are switched off, so searching me from other chats returns nothing.\n\n' +
        (settings
          ? `Turn them back on at ${settings}, under "Inline results".`
          : 'They were switched off from the dashboard, and that is where they come back on.')
      );
    },
  },
} as const;

export type InlineRefusal = keyof typeof INLINE_REFUSALS;

/** The button Telegram draws, without the reply text that is ours alone. */
export function refusalButton(refusal: InlineRefusal) {
  const { text, start_parameter } = INLINE_REFUSALS[refusal];
  return { text, start_parameter };
}

/**
 * The answer to `/start <parameter>` arriving back from one of those buttons.
 *
 * Without this the parameter falls through to the link handshake and is read
 * as a pairing token, and the person who tapped "inline results are off" is
 * told their link has expired — an answer to a question they did not ask.
 */
export function refusalReply(startParameter: string): string | null {
  const match = Object.values(INLINE_REFUSALS).find(
    (refusal) => refusal.start_parameter === startParameter,
  );
  return match?.reply ?? null;
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}
