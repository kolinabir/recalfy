import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ChannelAdapter, InboundHandler } from '../channels/channel';
import { LinkStore } from '../channels/link.store';
import { formatPairingCode } from '../channels/pairing-code';
import { ENV, Env } from '../config/env';
import { Address, Channel, Handle } from '../mongo/collections';
import { GraphClient } from './graph.client';
import { ParsedMessage, WhatsAppWebhook, parseMessages, unsupportedTypes } from './inbound';

/** Short: there is no walk-to-another-device delay in the manual flow. */
const PAIRING_TTL_MS = 5 * 60 * 1000;
const PAIRING_COOLDOWN_MS = 30 * 1000;

/** Meta's cap on a text body. Same as Telegram's, by coincidence rather than design. */
const MAX_MESSAGE_LENGTH = 4000;

/**
 * A template's body parameter is capped far shorter than a text message, and
 * Meta rejects the whole send rather than truncating it.
 */
const MAX_TEMPLATE_BODY = 1000;

/**
 * The link handshake. WhatsApp has no `/start <payload>` deep link, so the
 * website's button opens `wa.me/<number>?text=connect%20<token>` and the
 * person just presses send — the pre-filled text is the payload.
 */
const CONNECT = /^connect\s+(\S+)$/i;
const CODE = /^\/?code$/i;
const UNLINK = /^\/?unlink$/i;

/**
 * WhatsApp Cloud API, wrapped to look like every other channel.
 *
 * The one asymmetry it cannot hide is `notify`: Meta forbids free-form
 * messages more than 24 hours after the user's last one, so reaching someone
 * cold means an approved template. See channels/outbox.ts for who decides.
 */
@Injectable()
export class WhatsAppAdapter extends ChannelAdapter implements OnModuleInit {
  readonly channel: Channel = 'whatsapp';
  protected readonly maxMessageLength = MAX_MESSAGE_LENGTH;

  private readonly logger = new Logger(WhatsAppAdapter.name);
  private readonly handlers: InboundHandler[] = [];

  constructor(
    private readonly graph: GraphClient,
    private readonly links: LinkStore,
    @Inject(ENV) private readonly env: Env,
  ) {
    super();
  }

  /**
   * WhatsApp is optional. Say so at boot rather than at the first send —
   * nobody is linked here until the number is registered anyway, so an
   * unconfigured adapter is idle rather than broken.
   */
  onModuleInit(): void {
    this.logger.log(
      this.env.whatsappEnabled
        ? 'WhatsApp ready — access is by linked account'
        : 'WhatsApp not configured (WHATSAPP_PHONE_NUMBER_ID / _ACCESS_TOKEN unset); staying idle',
    );
  }

  onMessage(handler: InboundHandler): void {
    this.handlers.push(handler);
  }

  async send(handle: Handle, text: string): Promise<void> {
    await this.graph.sendText(handle, text);
  }

  /**
   * Outside the window, so this is a billed template send. The text becomes
   * the template's one body parameter, truncated rather than split: two
   * templates would be billed twice and could arrive out of order.
   */
  async notify(handle: Handle, text: string): Promise<void> {
    const body = text.length > MAX_TEMPLATE_BODY ? `${text.slice(0, MAX_TEMPLATE_BODY - 1)}…` : text;

    await this.graph.sendTemplate(
      handle,
      this.env.whatsappNotifyTemplate,
      this.env.whatsappTemplateLocale,
      // Newlines are legal in a parameter but tabs and runs of spaces are not,
      // and Meta rejects the send rather than trimming them.
      body.replace(/[\t ]{2,}/g, ' '),
    );
  }

  /**
   * WhatsApp has no standalone typing call — the indicator rides along with a
   * read receipt for a specific message, so this is a no-op and the real work
   * happens in `dispatch` where the message id is still in hand.
   */
  async typing(): Promise<void> {}

  /** Called by the controller once the request has already been acked. */
  async dispatch(body: WhatsAppWebhook): Promise<void> {
    for (const message of parseMessages(body)) {
      await this.handle(message).catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed handling message ${message.messageId}: ${detail}`);
      });
    }

    for (const { from, type } of unsupportedTypes(body)) {
      // Only tell people who are actually connected. Answering a stranger's
      // voice note is an unsolicited message to a number we know nothing
      // about, which is exactly what Meta's quality rating penalises.
      if (!(await this.links.resolve(this.addressOf(from)))) continue;
      await this.send(from, `I can only read text for now — a ${type} message won't reach me.`);
    }
  }

  private async handle(message: ParsedMessage): Promise<void> {
    const address = this.addressOf(message.from);
    const text = message.text.trim();

    // Read receipt and typing bubble before anything slow. Best-effort: a
    // cosmetic failure must never cost the user their reply.
    void this.graph.markReadAndTyping(message.messageId).catch(() => {});

    const connect = text.match(CONNECT);
    if (connect) {
      await this.completeLink(address, connect[1]);
      return;
    }

    const userId = await this.links.resolve(address);

    if (!userId) {
      await this.greetStranger(address, text);
      return;
    }

    if (UNLINK.test(text)) {
      const email = await this.links.unlink(address);
      await this.send(
        address.handle,
        email
          ? `Disconnected from ${email}. I won't reply here until it's connected again.`
          : "This chat isn't connected to an account.",
      );
      return;
    }

    await this.fanOut({
      userId,
      address,
      text: message.text,
      messageId: message.messageId,
      receivedAt: message.receivedAt,
    });
  }

  /**
   * Someone who found the number before the website. Unlike Telegram this
   * always answers: they messaged first, so the window is open and the reply
   * is free — and silence from a number you just texted reads as broken.
   */
  private async greetStranger(address: Address, text: string): Promise<void> {
    if (CODE.test(text)) {
      const wait = await this.links.pairingCooldown(address, PAIRING_COOLDOWN_MS);
      if (wait > 0) {
        await this.send(address.handle, `Hold on ${wait}s before asking for another code.`);
        return;
      }

      const code = await this.links.issuePairingCode(address, PAIRING_TTL_MS);
      await this.send(
        address.handle,
        `Your pairing code is\n\n${formatPairingCode(code)}\n\n` +
          `Type it into the "Connect manually" box on recalfy.com. It lasts ${PAIRING_TTL_MS / 60_000} minutes.\n\n` +
          'Nobody legitimate will ever ask you for this code — if someone did, ignore them.',
      );
      return;
    }

    this.logger.warn(`Dropped message from unlinked sender ${address.handle}`);
    await this.send(
      address.handle,
      "This number isn't connected to an account yet.\n\n" +
        'Sign in at recalfy.com and press "Connect WhatsApp".\n\n' +
        'If that link won\'t open on this device, send "code" here and type the code into the site instead.',
    );
  }

  private async completeLink(address: Address, token: string): Promise<void> {
    const result = await this.links.redeem(token, address);
    const reply = (text: string) => this.send(address.handle, text);

    switch (result.status) {
      case 'linked':
        await reply(
          `Connected to ${result.email}.\n\n` +
            'Tell me anything you\'d rather not hold in your head. If this wasn\'t you, send "unlink".',
        );
        return;
      case 'taken':
        await reply(
          `This number is already connected to ${result.email}. Send "unlink" here first if you want to move it.`,
        );
        return;
      case 'account-linked':
        await reply(
          'That account is already connected to a different WhatsApp number. Disconnect it there first.',
        );
        return;
      case 'invalid':
        await reply(
          'That link has expired or was already used. Open recalfy.com and press "Connect WhatsApp" for a fresh one.',
        );
    }
  }

  private addressOf(handle: Handle): Address {
    return { channel: this.channel, handle };
  }

  private async fanOut(message: Parameters<InboundHandler>[0]): Promise<void> {
    for (const handler of this.handlers) {
      await handler(message);
    }
  }
}
