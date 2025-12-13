import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookService {
  constructor(private prisma: PrismaService) {}

  // Обработка входящего звонка для верификации
  async processInboundCall(callId: string, clientNumber: string, confirmationNumber: string) {

    const verification = await this.prisma.phoneVerification.findFirst({
      where: { 
        callId, 
        phoneNumber: clientNumber,
        confirmationNumber 
      },
    });

    if (!verification) {
      return { message: 'Звонок не найден' };
    }

    if (verification.isVerified) {
      return { message: 'Звонок уже был подтвержден' };
    }

    // Проверяем не истек ли срок верификации
    if (new Date() > verification.expiresAt) {
      return { 
        message: 'Время для верификации истекло',
        success: false 
      };
    }

    // Создаём или обновляем пользователя
    const user = await this.prisma.user.upsert({
      where: { phone: clientNumber },
      update: { phoneVerified: true },
      create: { 
        phone: clientNumber, 
        phoneVerified: true,
        tgId: verification.tgId,
      },
    });

    // Если верификация содержит tgId и у пользователя он ещё не установлен — привязываем
    if (verification.tgId && user.tgId == null) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { tgId: verification.tgId },
      });
    }

    // Обновление статуса верификации и привязка к юзеру
    await this.prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { 
        isVerified: true,
        userId: user.id,
      },
    });

    return { ok: true };
  }
}
