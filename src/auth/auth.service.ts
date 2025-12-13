import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UcallerService } from './ucaller.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private ucallerService: UcallerService,
    private tokenService: TokenService,
  ) {}

  // Инициация авторизации — запускаем звонок для верификации
  async initiateAuth(phone: string, telegramId: string) {
    const tgId = BigInt(telegramId);

    // Проверяем существует ли юзер с таким телефоном
    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
    });

    // Проверяем, не привязан ли этот Telegram к другому пользователю
    const userByTg = await this.prisma.user.findUnique({
      where: { tgId },
    });

    if (userByTg && (!existingUser || userByTg.id !== existingUser.id)) {
      throw new UnauthorizedException('Этот Telegram уже привязан к другому аккаунту');
    }

    if (existingUser && existingUser.tgId && existingUser.tgId !== tgId) {
      throw new UnauthorizedException('Этот Telegram не привязан к этому номеру телефона');
    }

    const isNewUser = !existingUser;

    // Инициируем звонок
    const { callId, confirmationNumber } = await this.ucallerService.initiateCall(phone);

    // Создаём запись верификации (sessionToken и tgId сохраняем)
    const verification = await this.prisma.phoneVerification.create({
      data: {
        phoneNumber: phone,
        confirmationNumber,
        callId,
        tgId,
        expiresAt: new Date(Date.now() + 60 * 1000),
      },
    });

    return { 
      message: isNewUser 
        ? 'Пожалуйста, подтвердите свой номер через звонок.'
        : 'Подтвердите вход через звонок.',
      sessionToken: verification.sessionToken,
      confirmationNumber,
      isNewUser,
    };
  }

  // Проверка статуса верификации (пользователь пытается войти)
  async checkVerification(sessionToken: string) {
    const verification = await this.prisma.phoneVerification.findUnique({
      where: { sessionToken },
    });

    if (!verification) {
      return {
        success: false,
        verified: false,
        message: 'Сессия не найдена',
      };
    }

    // Запрещаем повторное использование
    if (verification.tokensIssued) {
      return {
        success: false,
        verified: true,
        message: 'Токены уже были выданы ранее',
      };
    }

    // Проверяем статус верификации
    if (verification.isVerified && verification.userId) {
      // Находим пользователя
      const user = await this.prisma.user.findUnique({
        where: { id: verification.userId },
      });

      if (!user) {
        return {
          success: false,
          verified: false,
          message: 'Пользователь не найден',
        };
      }

      // Верификация пройдена - генерируем токены
      const { accessToken, refreshToken } = this.tokenService.generateTokens(
        user.id,
        user.phone,
      );

      // Помечаем, что токены выданы, чтобы не использовать повторно
      await this.prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { tokensIssued: true },
      });

      return { 
        success: true,
        verified: true,
        message: 'Верификация пройдена. Вход разрешен.',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
        },
      };
    } else {
      // Верификация еще не пройдена - отказ
      return { 
        success: false,
        verified: false,
        message: 'Верификация не пройдена. Подтвердите номер телефона.',
      };
    }
  }

  // Обновление токенов через refresh token (сейчас не используется напрямую, но оставим на будущее)
  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token отсутствует');
    }

    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      const tokens = this.tokenService.generateTokens(user.id, user.phone);

      return {
        success: true,
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Невалидный refresh token');
    }
  }

  // Получение данных текущего пользователя
  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return {
      id: user.id,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
    };
  }
}
