import { Injectable } from '@nestjs/common';

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

  async reply(userId: UserId, text: string): Promise<void> {
    await this.log.record(userId, 'assistant', text);
    // Chunking belongs to the channel — the limit differs per network, and
    // only the Outbox knows which one this user is on.
    await this.outbox.reply(userId, text);
  }
}
