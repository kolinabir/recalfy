import { Address, Channel, Handle, UserId } from '../mongo/collections';
import { chunkMessage } from './message-chunker';

/** A message from someone whose chat account is linked to an account. */
export interface InboundMessage {
  /** Already resolved from the handle — see LinkStore. Never the channel's id. */
  userId: UserId;
  /** Where it came from, so the reply goes back to the same chat. */
  address: Address;
  text: string;
  /** The channel's own message id, as a string. For reply threading if ever needed. */
  messageId: string;
  receivedAt: Date;
}

export type InboundHandler = (msg: InboundMessage) => Promise<void>;

/**
 * The seam between the app and one chat network.
 *
 * Everything above this line works in terms of a `UserId` and a string. An
 * adapter is the only code that knows a Telegram update from a WhatsApp
 * webhook payload, and the fake used in tests satisfies the same interface —
 * which is what lets the whole product be driven without a network.
 */
export abstract class ChannelAdapter {
  abstract readonly channel: Channel;

  abstract onMessage(handler: InboundHandler): void;

  /**
   * A reply, inside a conversation the user just spoke in.
   *
   * On WhatsApp this is only legal within 24 hours of their last message.
   * The Outbox is what knows whether that holds; an adapter just sends.
   */
  abstract send(handle: Handle, text: string): Promise<void>;

  /**
   * Reaching someone who did not just message us — a due reminder, the daily
   * brief. Separate from `send` because the channels differ in kind here, not
   * in degree: Telegram treats it as an ordinary message, while WhatsApp
   * requires a pre-approved template and bills for it.
   */
  abstract notify(handle: Handle, text: string): Promise<void>;

  /** Best-effort "typing…" indicator. Never throws. */
  abstract typing(handle: Handle): Promise<void>;

  /** Longest single message this channel accepts. */
  protected abstract readonly maxMessageLength: number;

  /** Splits a long reply into sends this channel will accept. */
  chunk(text: string): string[] {
    return chunkMessage(text, this.maxMessageLength);
  }
}

/** Multi-provider token: every adapter the app has, injected as an array. */
export const CHANNEL_ADAPTERS = Symbol('CHANNEL_ADAPTERS');
