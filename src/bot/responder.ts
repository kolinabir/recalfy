import { Injectable } from '@nestjs/common';

import { Action } from '../channels/channel';
import { Outbox } from '../channels/outbox';
import { UserId } from '../mongo/collections';
import { ConversationLog } from './conversation-log';

/** Sends a reply and logs it, so no caller has to remember to do both. */
@Injectable()
export class Responder {
  constructor(
    private readonly outbox: Outbox,
    private readonly log: ConversationLog,
  ) {}

  async reply(
    userId: UserId,
    text: string,
    options: { actions?: readonly Action[]; threadId?: number; known?: readonly string[] } = {},
  ): Promise<void> {
    // Only the text is logged. A button is an offer, not something that was
    // said, and a transcript full of "[Undo]" would be read back to the model
    // on every subsequent turn as if it were part of the conversation.
    // `known` masks a password the model repeated back in its own words.
    await this.log.record(userId, 'assistant', text, options.known);
    // Chunking belongs to the channel — the limit differs per network, and
    // only the Outbox knows which one this user is on.
    const { known: _, ...delivery } = options;
    await this.outbox.reply(userId, text, delivery);
  }
}
