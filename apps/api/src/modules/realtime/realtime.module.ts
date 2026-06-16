import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceMember } from '../../database/entities';
import { RealtimeGateway } from './realtime.gateway';

@Global()
@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([WorkspaceMember])],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
