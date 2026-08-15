import type { InlineQueryResultArticle } from 'grammy/types';

import { Memory } from '../memory/memory.types';

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
    title: truncate(memory.text, TITLE_LIMIT),
    description: memory.group,
    input_message_content: {
      // Sent verbatim, with no parse_mode: a fact containing an underscore or
      // an asterisk would otherwise fail to send, or send half-formatted.
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
