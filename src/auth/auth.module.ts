import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WebhookService } from './webhook.service';
import { UcallerService } from './ucaller.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AutoRefreshGuard } from './guards/auto-refresh.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}), // Настройки в TokenService
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    WebhookService,
    UcallerService,
    TokenService,
    JwtStrategy,
    AutoRefreshGuard,
  ],
  exports: [TokenService, AutoRefreshGuard], // Экспортируем для использования в других модулях
})
export class AuthModule {}
