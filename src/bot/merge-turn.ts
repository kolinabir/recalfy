import { InboundMessage } from '../channels/channel';

/**
 * Several messages typed in a row are one thought, and answering each of them
 * separately is how you get two replies and two reminders for one interview.
 *
 * The merge is deliberately dumb — the texts, in order, as one message. The
 * model is what understands that "Interview tomorrow" and the forwarded note
 * about the job belong together; nothing here needs to.
 */

/**
 * A blank line between them, not a newline.
 *
 * A forwarded message is already two lines — its header and its body — so
 * joining with a single newline would make the next message look like a third
 * line of the forward, and the attribution the header exists to carry would
 * quietly cover the wrong text.
 */
const JOIN = '\n\n';

/**
 * Everything but the text comes from the *last* message: the reply belongs
 * under the message they finished on, in the thread they finished in, and the
 * 24-hour WhatsApp window is measured from the most recent thing they sent.
 */
export function mergeTurn(messages: readonly InboundMessage[]): InboundMessage {
  const last = messages[messages.length - 1];
  if (!last) throw new Error('A turn needs at least one message.');
  if (messages.length === 1) return last;

  const text = messages
    .map((message) => message.text.trim())
    .filter((part) => part !== '')
    .join(JOIN);

  return { ...last, text };
}

/**
 * What counts as "the same conversation" for batching.
 *
 * The channel is in the key because someone with both Telegram and WhatsApp
 * linked is in two conversations, not one, and a reply owes itself to the
 * chat it was asked in. The thread is in it for the same reason — see
 * InboundMessage.threadId.
 */
export function turnKey(message: InboundMessage): string {
  return `${message.userId}:${message.address.channel}:${message.threadId ?? ''}`;
}
