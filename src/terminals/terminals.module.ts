import { Module } from '@nestjs/common';
import { TerminalsGateway } from './terminals.gateway';
import { TerminalsService } from './terminals.service';
import { TerminalsController } from './terminals.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [TerminalsGateway, TerminalsService],
  controllers: [TerminalsController],
  exports: [TerminalsService],
})
export class TerminalsModule {}
