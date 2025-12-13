import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // Access токен истёк → 403 (клиент должен использовать refresh)
    if (info instanceof TokenExpiredError) {
      throw new ForbiddenException('Access token истёк');
    }

    // Нет токена или невалидный → 401 (нужна авторизация)
    if (err || !user) {
      throw new UnauthorizedException('Необходима авторизация');
    }

    return user;
  }
}
