import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuthSession } from './entities/auth-session.entity';
import { OAuthIdentity } from './entities/oauth-identity.entity';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    ConfigModule,
    TypeOrmModule.forFeature([AuthSession, OAuthIdentity]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
