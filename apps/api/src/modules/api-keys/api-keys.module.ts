import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../../database/entities';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';

// Global so JwtAuthGuard can resolve ApiKeysService for API-key authentication.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
