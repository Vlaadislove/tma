import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TerminalsService } from './terminals.service';
import type { SendGpioCommandInput, OpenCellInput } from './terminals.service';
import { AutoRefreshGuard } from '../auth/guards/auto-refresh.guard';
import { User } from 'prisma/generated/prisma/client';



@Controller('terminals')
export class TerminalsController {
  constructor(private readonly terminalsService: TerminalsService) {}

  @Get('online')
  @UseGuards(AutoRefreshGuard)
  getOnline() {
    return this.terminalsService.listOnline();
  }

  @Get('rents')
  @UseGuards(AutoRefreshGuard)
  getMyRents(@Req() req: Request & { user: { id: number; phone: string } }) {
    const user = req.user;
    if (!user?.id) {
      throw new BadRequestException('User not found in request');
    }
    return this.terminalsService.listUserRents(user.id);
  }

  @Get(':terminalId/state')
  @UseGuards(AutoRefreshGuard)
  getState(@Param('terminalId') terminalId: string) {
    if (!terminalId?.trim()) {
      throw new NotFoundException('Terminal id is required');
    }
    return this.terminalsService.getState(terminalId.trim());
  }

  @Get(':terminalId/items')
  @UseGuards(AutoRefreshGuard)
  getTerminalItems(@Param('terminalId') terminalId: string) {
    if (!terminalId?.trim()) {
      throw new NotFoundException('Terminal id is required');
    }
    return this.terminalsService.getTerminalItems(terminalId.trim());
  }


  @Post(':terminalId/cells/:cellId/start')
  @UseGuards(AutoRefreshGuard)
  startRent(
    @Param('terminalId') terminalId: string,
    @Param('cellId') cellId: string,
    @Req() req: Request & { user: { id: number; phone: string } },
  ) {
    if (!terminalId?.trim()) {
      throw new NotFoundException('Terminal id is required');
    }

    const user = req.user;
    return this.terminalsService.startRent(terminalId.trim(), cellId.trim(), user.id);
  }

  @Post(':terminalId/cells/:cellId/finish')
  @UseGuards(AutoRefreshGuard)
  finishRent(
    @Param('terminalId') terminalId: string,
    @Param('cellId') cellId: string,
    @Req() req: Request & { user: { id: number; phone: string } },
  ) {
    if (!terminalId?.trim()) {
      throw new NotFoundException('Terminal id is required');
    }
    const user = req.user;
    console.log('finishRent', terminalId.trim(), cellId.trim(), user.id);
    return this.terminalsService.finishRent(terminalId.trim(), cellId.trim(), user.id);
  }
}
