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
