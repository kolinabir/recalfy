/** A message that made it past the secret-token check and the allowlist. */
export interface InboundMessage {
  userId: number;
  text: string;
  /** Telegram's own message id, for reply threading if ever needed. */
  messageId: number;
  receivedAt: Date;
}

export type InboundHandler = (msg: InboundMessage) => Promise<void>;

/**
 * The seam between the app and Telegram.
 *
 * Two methods, deliberately: everything above this line works in terms of a
 * user id and a string. The fake adapter used in tests satisfies the same
 * interface, which is what lets the whole product be driven without a network.
 */
export abstract class Ingress {
  abstract onMessage(handler: InboundHandler): void;
  abstract send(userId: number, text: string): Promise<void>;
  /** Best-effort "typing…" indicator. Never throws. */
  abstract typing(userId: number): Promise<void>;
}
