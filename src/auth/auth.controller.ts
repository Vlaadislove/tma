import { Controller, Post, Get, Body, Req, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { WebhookService } from './webhook.service';
import { AutoRefreshGuard } from './guards/auto-refresh.guard';
import { WebhookDto } from './dto/webhook.dto';
import { CheckVerificationDto } from './dto/check-verification.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  // Инициация авторизации — запускаем звонок для верификации
  @Post('login')
  async login(
    @Body('phone') phone: string,
    @Body('telegramId') telegramId: string,
  ) {
    return await this.authService.initiateAuth(phone, telegramId);
  }

  // Проверка статуса верификации (для входа пользователя)
  @Post('check-verification')
  async checkVerification(
    @Body() body: CheckVerificationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.checkVerification(body.sessionToken);

    // Если верификация успешна — ставим токены в cookies
    if (result.success && result.accessToken && result.refreshToken) {
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 минут
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
      });

      // Убираем токены из ответа — они уже в cookies
      const { accessToken, refreshToken, ...response } = result;
      return response;
    }

    return result;
  }

  // Обработка входящих вебхуков (например, от ucaller)
  @Post('webhook')  
  async handleWebhook(@Body() body: WebhookDto, @Req() req: Request) {
    // Проверка IP адреса Ucaller
    const allowedIpsString = this.configService.get<string>('UCALLER_ALLOWED_IPS');
    
    if (!allowedIpsString) {
      throw new ForbiddenException('UCALLER_ALLOWED_IPS not configured');
    }
    
    const allowedIps = allowedIpsString.split(',').map(ip => ip.trim());
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const realIp = forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip || 'unknown';

    if (!allowedIps.includes(realIp)) {
      throw new ForbiddenException(`Access denied from IP: ${realIp}`);
    }

    const { callId, clientNumber, confirmationNumber } = body;
    return await this.webhookService.processInboundCall(callId, clientNumber, confirmationNumber);
  }

  // Получение данных текущего пользователя (с автообновлением токенов)
  @Get('me')
  @UseGuards(AutoRefreshGuard)
  async getMe(@Req() req: Request & { user: { id: number; phone: string } }) {
    return this.authService.getMe(req.user.id);
  }

  // Выход из аккаунта
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { success: true, message: 'Вы вышли из аккаунта' };
  }
}
