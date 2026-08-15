import { Module } from '@nestjs/common';

import { ChannelsModule } from '../channels/channels.module';
import { Paywall } from './paywall';
import { SubscriptionsModule } from './subscriptions.module';

/**
 * Reads the billing state the web app mirrors from Paddle, and answers the one
 * question the rest of the bot asks of it: may this account be served?
 *
 * Nothing here writes. Paddle's webhook lives in the dashboard, which is the
 * only process that should ever author a subscription row.
 */
@Module({
  imports: [ChannelsModule, SubscriptionsModule],
  providers: [Paywall],
  // Re-exported so existing importers keep getting both from one module.
  exports: [Paywall, SubscriptionsModule],
})
export class BillingModule {}
