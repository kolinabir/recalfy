import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { BrainModule } from '../brain/brain.module';
import { MemoryModule } from '../memory/memory.module';
import { ChannelsModule } from '../channels/channels.module';
import { BotService } from './bot.service';
import { ConversationLog } from './conversation-log';
import { Responder } from './responder';

@Module({
  imports: [ChannelsModule, MemoryModule, BrainModule, BillingModule],
  providers: [ConversationLog, Responder, BotService],
  exports: [ConversationLog],
})
export class BotModule {}
