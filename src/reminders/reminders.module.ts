import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { ChannelsModule } from '../channels/channels.module';
import { MemoryModule } from '../memory/memory.module';
import { ReminderDelivery } from './reminder-delivery';
import { ReminderScheduler } from './reminder.scheduler';
import { ReminderStore } from './reminder.store';

@Module({
  imports: [ChannelsModule, BillingModule, MemoryModule],
  providers: [ReminderStore, ReminderScheduler, ReminderDelivery],
  exports: [ReminderStore],
})
export class RemindersModule {}
