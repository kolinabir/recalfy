import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { BrainModule } from '../brain/brain.module';
import { MemoryModule } from '../memory/memory.module';
import { ChannelsModule } from '../channels/channels.module';
import { TopicsModule } from '../topics/topics.module';
import { BotService } from './bot.service';
import { ConversationLog } from './conversation-log';
import { Responder } from './responder';
import { UndoService } from './undo.service';

@Module({
  imports: [ChannelsModule, MemoryModule, BrainModule, BillingModule, TopicsModule],
  providers: [ConversationLog, Responder, BotService, UndoService],
  exports: [ConversationLog],
})
export class BotModule {}
