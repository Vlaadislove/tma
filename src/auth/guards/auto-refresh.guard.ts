import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../token.service';
import type { Request, Response } from 'express';

@Injectable()
export class AutoRefreshGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const accessToken = request.cookies?.accessToken;
    const refreshToken = request.cookies?.refreshToken;

    // 1. Пробуем access token
    if (accessToken) {
      try {
        const payload = this.tokenService.verifyAccessToken(accessToken);
        request.user = { id: payload.sub, phone: payload.phone };
        return true;
      } catch {
        // Access истёк — пробуем refresh
      }
    }

    // 2. Пробуем refresh token
    if (!refreshToken) {
      throw new UnauthorizedException('Необходима авторизация');
    }

    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);

      // Генерируем новую пару токенов
      const tokens = this.tokenService.generateTokens(payload.sub, payload.phone);

      // Ставим в cookies
      response.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 минут
      });

      response.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
      });

      (request as any).user = { id: payload.sub, phone: payload.phone };
      return true;
    } catch {
      // Refresh тоже невалидный — очищаем cookies
      response.clearCookie('accessToken');
      response.clearCookie('refreshToken');
      throw new UnauthorizedException('Сессия истекла. Войдите заново.');
    }
  }
}

