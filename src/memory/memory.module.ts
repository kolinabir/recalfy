import { Module } from '@nestjs/common';

import { MemoryStore } from './memory.store';
import { SidMinter } from './sid-minter';
import { UserStore } from './user.store';
import { Vault } from './vault.service';

@Module({
  providers: [MemoryStore, SidMinter, UserStore, Vault],
  exports: [MemoryStore, UserStore, Vault],
})
export class MemoryModule {}
