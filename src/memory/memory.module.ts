import { Module } from '@nestjs/common';

import { MemoryStore } from './memory.store';
import { SidMinter } from './sid-minter';
import { UserStore } from './user.store';

@Module({
  providers: [MemoryStore, SidMinter, UserStore],
  exports: [MemoryStore, UserStore],
})
export class MemoryModule {}
