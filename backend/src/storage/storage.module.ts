import { Global, Module } from '@nestjs/common';
import { StorageService } from './private-file-storage';

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
