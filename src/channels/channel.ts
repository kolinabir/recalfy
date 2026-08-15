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

/** A button drawn under a message. `data` is minted by whoever draws it. */
export interface Action {
  label: string;
  /** See action-data.ts — opaque here, and length-checked before it gets here. */
  data: string;
}

/**
 * A button press.
 *
 * `settle` is how the press is answered: the buttons come off and the message
 * gains a line saying what happened. That matters more than a reply would —
 * a keyboard that stays tappable after the fact invites a second press, and
 * "undo" pressed twice is a question nobody should have to think about.
 */
export interface InboundAction {
  userId: UserId;
  address: Address;
  data: string;
  settle: (text: string) => Promise<void>;
}

/** True when this handler owned the press; false to let the next one look. */
export type ActionHandler = (action: InboundAction) => Promise<boolean>;

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
   * Button presses, for the networks that have buttons. A no-op by default,
   * so a channel without them costs nothing above this line: the buttons are
   * simply never drawn, and no handler ever fires.
   */
  onAction(_handler: ActionHandler): void {}

  /**
   * A reply, inside a conversation the user just spoke in.
   *
   * On WhatsApp this is only legal within 24 hours of their last message.
   * The Outbox is what knows whether that holds; an adapter just sends.
   *
   * `actions` are advisory: a channel that cannot draw buttons sends the text
   * and drops them, which is always a legible message rather than a broken one.
   */
  abstract send(handle: Handle, text: string, actions?: readonly Action[]): Promise<void>;

  /**
   * Reaching someone who did not just message us — a due reminder, the daily
   * brief. Separate from `send` because the channels differ in kind here, not
   * in degree: Telegram treats it as an ordinary message, while WhatsApp
   * requires a pre-approved template and bills for it.
   */
  abstract notify(handle: Handle, text: string, actions?: readonly Action[]): Promise<void>;

  /** Best-effort "typing…" indicator. Never throws. */
  abstract typing(handle: Handle): Promise<void>;

  /**
   * True when the reply can be shown while it is still being written. Where
   * this holds, the typing indicator is redundant and skipped — a half-written
   * sentence says everything "typing…" was standing in for.
   */
  readonly streams: boolean = false;

  /**
   * Paints the partial reply. `draftId` groups the frames: successive calls
   * with the same id replace each other rather than stacking up.
   *
   * Best-effort by contract — see Draft, which is what actually calls this.
   */
  async draft(_handle: Handle, _draftId: number, _text: string): Promise<void> {}

  /** Longest single message this channel accepts. */
  protected abstract readonly maxMessageLength: number;

  /** Splits a long reply into sends this channel will accept. */
  chunk(text: string): string[] {
    return chunkMessage(text, this.maxMessageLength);
  }
}

/** Multi-provider token: every adapter the app has, injected as an array. */
export const CHANNEL_ADAPTERS = Symbol('CHANNEL_ADAPTERS');
