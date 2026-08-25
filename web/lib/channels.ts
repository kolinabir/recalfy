/**
 * Facts about each chat, shared by server and client.
 *
 * Deliberately a plain module — no "use client", no "server-only". It used to
 * live in connect-chat.tsx, which is a client component, and a Server
 * Component reading it got `undefined`: Next.js swaps every export of a
 * "use client" module for a client reference, so the object is real in the
 * browser and hollow on the server. Anything both sides read has to sit
 * outside both boundaries.
 */

export type Channel = "telegram" | "whatsapp";

/**
 * The channels someone can actually connect today.
 *
 * WhatsApp is built and its code is all still here — the adapter, the webhook,
 * the signature guard, the entitlement — but it is switched off: connecting it
 * asked people to register a phone number with Meta before they could use the
 * product, and one chat app is enough to be useful. Turning it back on means
 * adding it to this list and re-registering the adapter in
 * `src/channels/channels.module.ts`.
 *
 * Everything that decides whether to draw a button, mint a token, or accept a
 * handshake reads this. A channel offered in one place and refused in another
 * is the failure this list exists to prevent.
 */
export const AVAILABLE_CHANNELS: readonly Channel[] = ["telegram"];

export function isChannelAvailable(channel: Channel): boolean {
  return AVAILABLE_CHANNELS.includes(channel);
}

export interface ChannelCopy {
  /** Product name, as it appears in every label. */
  name: string;
  /** What the person does in the chat to finish. Sentence case, no full stop. */
  action: string;
  /** What they send to get a pairing code manually. */
  codeCommand: string;
  /** What they send to disconnect. */
  unlinkCommand: string;
}

export const CHANNEL_COPY: Record<Channel, ChannelCopy> = {
  telegram: {
    name: "Telegram",
    action: "press Start",
    codeCommand: "/code",
    unlinkCommand: "/unlink",
  },
  whatsapp: {
    name: "WhatsApp",
    // The link only fills the message box; nothing is sent until they tap.
    action: "press send",
    codeCommand: "code",
    unlinkCommand: "unlink",
  },
};
