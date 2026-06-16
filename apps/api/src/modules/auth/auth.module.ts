import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import {
  User,
  Workspace,
  WorkspaceMember,
  Session,
  VerificationToken,
} from '../../database/entities';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { VerificationService } from './verification.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';

// Register the Google strategy only when credentials are configured.
const googleProvider: Provider = {
  provide: 'GOOGLE_STRATEGY',
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    config.get<boolean>('google.enabled') ? new GoogleStrategy(config) : null,
};

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Workspace, WorkspaceMember, Session, VerificationToken]),
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionsService, VerificationService, JwtStrategy, googleProvider],
  exports: [AuthService, SessionsService],
})
export class AuthModule {}
