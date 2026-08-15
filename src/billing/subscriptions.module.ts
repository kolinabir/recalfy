import { Module } from '@nestjs/common';

import { Subscriptions } from './subscriptions';

/**
 * `Subscriptions` on its own, with no imports at all — it needs only the
 * globally-provided Mongo connection and environment.
 *
 * Split out from BillingModule because that one pulls in ChannelsModule (the
 * Paywall has to be able to send a notice), and ChannelsModule owns the
 * adapters. Any adapter needing to ask "what has this account paid for" would
 * therefore close a cycle: Telegram → Billing → Channels → Telegram. This
 * module is the half with no such gravity, so anything can read it.
 */
@Module({
  providers: [Subscriptions],
  exports: [Subscriptions],
})
export class SubscriptionsModule {}
