import { Module } from '@nestjs/common';

import { MongoModule } from '../mongo/mongo.module';
import { LinkStore } from './link.store';
import { OwnerAccount } from './owner-account';

/**
 * Separate from ChannelsModule on purpose. Every adapter needs to resolve a
 * handle to an account, and ChannelsModule imports every adapter — so linking
 * has to sit below both or the graph is a cycle.
 */
@Module({
  imports: [MongoModule],
  providers: [LinkStore, OwnerAccount],
  exports: [LinkStore],
})
export class LinkModule {}
