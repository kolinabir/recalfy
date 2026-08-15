import type { InlineQueryResultArticle } from 'grammy/types';

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
const THUMBNAIL = 'https://www.recalfy.com/inline.png';
const THUMBNAIL_SIZE = 128;

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
    thumbnail_url: THUMBNAIL,
    thumbnail_width: THUMBNAIL_SIZE,
    thumbnail_height: THUMBNAIL_SIZE,
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
 * What an unlinked or lapsed person sees. Telegram renders this as a button
 * above the empty list, and tapping it opens a private chat with the bot.
 *
 * An empty answer with no button is indistinguishable from a broken bot —
 * the panel just spins and then shows nothing.
 */
export function connectButton(text: string) {
  return { text, start_parameter: 'inline' };
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}
