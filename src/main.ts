import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new WsAdapter(app));
  
  // Настройка CORS для работы с фронтендом
  app.enableCors({
    origin: [
      'http://localhost:5173', // локальный фронт
      'https://assuring-strangely-flamingo.ngrok-free.app', // публичный ngrok
    ],
    credentials: true, // Разрешаем отправку cookies
  });
  
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
