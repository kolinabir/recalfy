import { DateTime } from 'luxon';

/**
 * Marks a forwarded message as somebody else's words.
 *
 * Same idea as location-text.ts: the difference is resolved into *text* at the
 * edge, and nothing downstream learns that forwarding exists. The brain reads
 * one string, stores ordinary facts with ordinary short ids, and `recall_source`
 * quotes this line back later — so "how do you know?" answers itself with who
 * said it and when.
 *
 * This is a correction, not a new capability. A forwarded text message already
 * arrived as an ordinary `message:text` and was filed as though the user had
 * typed it — which is how "I'll bring the cake Saturday" became a fact about
 * the user rather than about Sara. The prefix is what stops that.
 */

/**
 * The shapes Telegram gives us, declared here so nothing else imports grammY.
 * Deliberately loose: every field the Bot API marks optional is optional here,
 * because the only thing this module does with them is look for a name.
 */
export interface ForwardOrigin {
  type: 'user' | 'hidden_user' | 'chat' | 'channel';
  /** When the *original* message was sent, as a Unix timestamp. */
  date: number;
  sender_user?: { first_name?: string; last_name?: string; username?: string };
  /** Set instead of `sender_user` when the sender forbids linking their account. */
  sender_user_name?: string;
  sender_chat?: { title?: string; first_name?: string; username?: string };
  chat?: { title?: string; first_name?: string; username?: string };
  author_signature?: string;
}

/**
 * The prefix the system prompt keys on. Exported so the rule in the prompt and
 * the text that triggers it cannot drift apart.
 */
export const FORWARD_PREFIX = 'Forwarded from';

/** When Telegram gives us nothing to call them. Better than an empty name. */
const ANONYMOUS = 'someone';

/**
 * The header and the message, on separate lines.
 *
 * A newline rather than ": " because a forward is frequently several sentences
 * and the header would otherwise read as the first one of them.
 */
export function withForwardOrigin(origin: ForwardOrigin | undefined, text: string): string {
  if (!origin) return text;
  return `${FORWARD_PREFIX} ${senderOf(origin)} (sent ${sentAt(origin.date)}):\n${text}`;
}

function senderOf(origin: ForwardOrigin): string {
  const name =
    clean(
      [origin.sender_user?.first_name, origin.sender_user?.last_name]
        .map(clean)
        .filter(Boolean)
        .join(' '),
    ) ||
    clean(origin.sender_user_name) ||
    clean(origin.sender_chat?.title ?? origin.sender_chat?.first_name) ||
    clean(origin.chat?.title ?? origin.chat?.first_name) ||
    clean(origin.sender_user?.username ?? origin.sender_chat?.username ?? origin.chat?.username) ||
    ANONYMOUS;

  // A channel post carries the name of whoever signed it, which is usually the
  // person the user means when they say "Kolin posted this".
  const signature = clean(origin.author_signature);
  return signature && signature !== name ? `${name} — ${signature}` : name;
}

/**
 * UTC, spelled out.
 *
 * The adapter has no idea what timezone the user is in — that is known one
 * layer up, where the prompt is built — so the instant is stated unambiguously
 * and the model renders it in their zone when it speaks. Which matters: a
 * forward saying "tomorrow" means the day after *this* date, not after today.
 */
function sentAt(date: number): string {
  return DateTime.fromSeconds(date, { zone: 'utc' }).toFormat("d LLL yyyy, HH:mm 'UTC'");
}

function clean(part: string | undefined): string {
  return part?.trim() ?? '';
}
