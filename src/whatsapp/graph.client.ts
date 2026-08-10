import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV, Env } from '../config/env';
import { Handle } from '../mongo/collections';

/**
 * The Cloud API, as much of it as Recalfy uses. Four calls: free-form text,
 * a template, a read receipt, and the typing indicator that rides along with
 * it.
 *
 * Written against `fetch` rather than a WhatsApp SDK — the surface here is
 * four POSTs to one endpoint, and Meta's own SDKs lag their API versions.
 */
@Injectable()
export class GraphClient {
  private readonly logger = new Logger(GraphClient.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  private get endpoint(): string {
    const { graphApiVersion, whatsappPhoneNumberId } = this.env;
    return `https://graph.facebook.com/${graphApiVersion}/${whatsappPhoneNumberId}/messages`;
  }

  /** Only legal inside the 24-hour window; the Outbox is what enforces that. */
  async sendText(to: Handle, body: string): Promise<void> {
    await this.post({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      // Recalfy's replies are prose, and an unfurled link card in the middle
      // of a memory is noise.
      text: { preview_url: false, body },
    });
  }

  /**
   * The only way to reach someone whose window has closed. `template` must
   * already be approved in WhatsApp Manager with exactly one body parameter.
   */
  async sendTemplate(to: Handle, name: string, locale: string, body: string): Promise<void> {
    await this.post({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name,
        language: { code: locale },
        components: [{ type: 'body', parameters: [{ type: 'text', text: body }] }],
      },
    });
  }

  /**
   * Marks the user's message read and shows the typing bubble in one call —
   * Meta accepts both on the same request, and the indicator expires by
   * itself after 25 seconds or when the reply lands.
   */
  async markReadAndTyping(messageId: string): Promise<void> {
    await this.post({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
      typing_indicator: { type: 'text' },
    });
  }

  private async post(payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) return;

    // Meta puts the actionable part in a JSON error body — a 400 here is
    // usually "outside the window" or "template not approved", and the raw
    // status alone would send you looking in the wrong place.
    const detail = await response.text().catch(() => '');
    this.logger.error(`Graph API ${response.status}: ${detail.slice(0, 500)}`);
    throw new Error(`WhatsApp send failed with ${response.status}`);
  }
}
