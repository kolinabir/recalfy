import { Injectable } from '@nestjs/common';

import { chunkMessage } from '../telegram/message-chunker';
import { Ingress } from '../telegram/ingress';
import { ConversationLog } from './conversation-log';

/** Sends a reply and logs it, so no caller has to remember to do both. */
@Injectable()
export class Responder {
  constructor(
    private readonly ingress: Ingress,
    private readonly log: ConversationLog,
  ) {}

  async reply(userId: number, text: string): Promise<void> {
    await this.log.record(userId, 'assistant', text);
    for (const chunk of chunkMessage(text)) {
      await this.ingress.send(userId, chunk);
    }
  }
}
