import { Injectable, OnModuleInit } from '@nestjs/common';

import { BrainService } from '../brain/brain.service';
import { UserStore } from '../memory/user.store';
import { InboundMessage, Ingress } from '../telegram/ingress';
import { ConversationLog } from './conversation-log';
import { Responder } from './responder';

/**
 * The one place inbound messages become outbound ones. Reads as the shape of
 * a turn: identify, acknowledge, log, think, reply.
 *
 * There are no commands. Everything the user types is ordinary conversation,
 * and the model decides whether that means answering, remembering, forgetting,
 * or scheduling.
 */
@Injectable()
export class BotService implements OnModuleInit {
  constructor(
    private readonly ingress: Ingress,
    private readonly users: UserStore,
    private readonly log: ConversationLog,
    private readonly brain: BrainService,
    private readonly responder: Responder,
  ) {}

  onModuleInit(): void {
    this.ingress.onMessage((message) => this.handle(message));
  }

  private async handle({ userId, text, receivedAt }: InboundMessage): Promise<void> {
    await this.users.ensure(userId);
    await this.ingress.typing(userId);

    const sourceMessageId = await this.log.record(userId, 'user', text);
    const reply = await this.brain.handle(userId, text, receivedAt, sourceMessageId);

    await this.responder.reply(userId, reply);
  }
}
