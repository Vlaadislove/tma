import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type TerminalStatePayload = {
  pins?: Array<{
    id: number;
    level: string;
    remainingSeconds: number;
    timerSeconds: number;
    finishTimestamp?: number;
  }>;
  [key: string]: unknown;
};

export type TerminalInfo = {
  terminalId: string; // db id
  terminalCode?: string;
  terminalDbId?: string;
  terminalName?: string;
  location?: string | null;

  lastPayload?: TerminalStatePayload;
  lastEnvelope?: unknown;
  cells?: Array<{
    id: string;
    index: number;
    gpioPin: number;
    label: string | null;
    status: string;
    isActive: boolean;
    item: {
      id: string;
      name: string;
      sku: string | null;
      createdAt: string;
    } | null;
  }>;
};

type Connection = {
  code: string;
  dbId: string;
  socket: WebSocket;
  connectedAt: Date;
  lastStateAt?: Date;
  lastPayload?: TerminalStatePayload;
  lastEnvelope?: unknown;
};

@Injectable()
export class TerminalsService {
  private readonly connectionsByCode = new Map<string, Connection>();
  private readonly rentCompleted = 'COMPLETED';

  constructor(private readonly prisma: PrismaService) { }

  register(code: string, dbId: string, socket: WebSocket) {
    const existing = this.connectionsByCode.get(code);
    if (existing && existing.socket !== socket) {
      try {
        existing.socket.close(1012, 'duplicate connection');
      } catch {
        // ignore close errors
      }
    }

    this.connectionsByCode.set(code, {
      code,
      dbId,
      socket,
      connectedAt: new Date(),
    });
  }

  unregister(socket: WebSocket): string | null {
    let targetCode: string | null = null;
    for (const [code, conn] of this.connectionsByCode.entries()) {
      if (conn.socket === socket) {
        targetCode = code;
        break;
      }
    }
    if (!targetCode) {
      return null;
    }
    this.connectionsByCode.delete(targetCode);
    return targetCode;
  }

  updateState(client: WebSocket, payload: unknown) {
    const connection = this.findConnection(client);
    if (!connection) {
      return;
    }

    connection.lastPayload = (payload ?? {}) as TerminalStatePayload;
    connection.lastStateAt = new Date();
  }

  touch(client: WebSocket, envelope: unknown) {
    const connection = this.findConnection(client);
    if (!connection) {
      return;
    }

    connection.lastEnvelope = envelope;
  }

  async listOnline(): Promise<Array<{ terminalId: string; location: string, name: string, lon: number, lat: number }>> {
    const ids = Array.from(this.connectionsByCode.values()).map((c) => c.dbId);
    if (ids.length === 0) {
      return [];
    }
    const terminals = await this.prisma.terminal.findMany({
      where: { id: { in: ids } },
      select: { id: true, location: true, name: true, lon: true, lat: true },
    });

    return terminals.map((t) => ({
      terminalId: t.id,
      location: t.location ?? '',
      name: t.name ?? '',
      lon: t.lon ?? 0,
      lat: t.lat ?? 0,
    }));
  }

  async getState(terminalId: string): Promise<TerminalInfo> {
    const conn = this.findById(terminalId);
    if (!conn) {
      throw new NotFoundException(
        `Terminal ${terminalId} is offline or unknown`,
      );
    }

    const db = await this.prisma.terminal.findUnique({
      where: { id: terminalId },
      include: {
        cells: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!db?.id) {
      throw new NotFoundException(
        `Terminal ${terminalId} not found in DB`,
      );
    }
    return {
      terminalId: db.id,
      terminalName: db?.name,
      location: db?.location,

      cells:
        db?.cells?.map((cell) => ({
          id: cell.id,
          index: cell.index,
          gpioPin: cell.gpioPin,
          label: cell.label,
          status: cell.status,
          isActive: cell.isActive,
          item: cell.item ? {
            id: cell.item.id,
            name: cell.item.name,
            sku: cell.item.sku,
            createdAt: cell.item.createdAt.toISOString(),
          } : null,
        })) ?? [],
    };
  }

  async getTerminalItems(terminalId: string) {
    const conn = this.findById(terminalId);
    if (!conn) {
      throw new NotFoundException(
        `Terminal ${terminalId} is offline or unknown`,
      );
    }

    const db = await this.prisma.terminal.findUnique({
      where: { id: terminalId },
      include: {
        cells: {
          include: {
            item: true,
            currentRent: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!db) {
      return [];
    }

    return db.cells
      .filter((cell) => cell.item !== null)
      .map((cell) => ({
        id: cell.item!.id,
        name: cell.item!.name,
        sku: cell.item!.sku,
        cellId: cell.id,
        cellIndex: cell.index,
        cellLabel: cell.label,
        status: cell.status,
        isRented: cell.status === 'OCCUPIED',
        createdAt: cell.item!.createdAt.toISOString(),
      }));
  }

  async listUserRents(userId: number) {
    const rents = await this.prisma.rent.findMany({
      where: { userId: userId.toString(), status: 'ACTIVE' },
      include: {
        item: true,
        cell: {
          select: {
            id: true,
            index: true,
            label: true,
            terminal: { select: { id: true, code: true, name: true, location: true } },
          },
        },
      },
    });

    return rents.map((rent) => ({
      id: rent.id,
      status: rent.status,
      startedAt: rent.startedAt,
      finishedAt: rent.finishedAt,
      cell: {
        id: rent.cell.id,
        index: rent.cell.index,
        label: rent.cell.label ?? null,
        terminal: rent.cell.terminal,
      },
      item: rent.item ?? null,
    }));
  }

  sendGpioCommand(terminalId: string, payload: SendGpioCommandInput) {
    const conn = this.findById(terminalId) ?? this.connectionsByCode.get(terminalId);;
    if (!conn || conn.socket.readyState !== WebSocket.OPEN) {
      throw new NotFoundException(`Terminal ${terminalId} is not online`);
    }

    const commandId = payload.commandId?.trim() || randomUUID();
    const durationSeconds =
      typeof payload.durationSeconds === 'number' && payload.durationSeconds > 0
        ? payload.durationSeconds
        : 0;

    const envelope = {
      event: 'gpio-command',
      data: {
        commandId,
        id: commandId,
        gpioPin: payload.gpioPin,
        durationSeconds,
      },
    };

    conn.socket.send(JSON.stringify(envelope));
    return { commandId };
  }

  async startRent(
    terminalId: string,
    cellId: string,
    userId: number,
  ): Promise<{ commandId: string }> {

    const terminal = await this.prisma.terminal.findUnique({
      where: { id: terminalId },
    });
    if (!terminal) {
      throw new NotFoundException(`Terminal ${terminalId} not found in DB`);
    }

    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
      include: { terminal: true },
    });

    if (!cell) {
      throw new NotFoundException(
        `Cell not found for terminal ${terminalId}`,
      );
    }
    if (cell.status !== 'FREE') {
      throw new BadRequestException('Cell is not free');
    }

    const commandId = randomUUID();

    await this.prisma.command.create({
      data: {
        commandId,
        terminalId: terminal.id,
        cellId: cell.id,
        rentId: cell.currentRentId ?? undefined,
        userId: userId.toString(),
        itemId: cell.itemId ?? undefined,
        action: 'ACTIVE',
      },
    });

    return this.sendGpioCommand(terminalId, {
      commandId,
      gpioPin: cell.gpioPin,
      durationSeconds: 2,
    });
  }

  async finishRent(
    terminalId: string,
    cellId: string,
    userId: number,
  ): Promise<{ commandId: string }> {
    const terminal = await this.prisma.terminal.findUnique({
      where: { id: terminalId },
    });
    if (!terminal) {
      throw new NotFoundException(`Terminal ${terminalId} not found in DB`);
    }
    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
      include: { terminal: true, currentRent: { select: { id: true, userId: true } } },
    });

    if (!cell) {
      throw new NotFoundException(`Cell not found for terminal ${terminalId}`);
    }
    if (cell.status === 'FREE') {
      throw new BadRequestException('Cell is already free');
    }

    if (cell.currentRent?.userId && cell.currentRent.userId !== userId.toString()) {
      throw new BadRequestException('This cell is rented by another user');
    }
    let rentId = cell.currentRentId ?? null;
    if (!rentId) {
      const activeRent = await this.prisma.rent.findFirst({
        where: { cellId: cell.id, status: 'ACTIVE' },
        select: { id: true },
      });
      rentId = activeRent?.id ?? null;
    }

    const commandId = randomUUID();
    await this.prisma.command.create({
      data: {
        commandId,
        terminalId: terminal.id,
        cellId: cell.id,
        rentId: rentId ?? undefined,
        userId: userId.toString(),
        itemId: cell.itemId ?? undefined,
        action: 'COMPLETED',
      },
    });

    return this.sendGpioCommand(terminalId, {
      commandId,
      gpioPin: cell.gpioPin,
      durationSeconds: 2,
    });
  }

  async handleCommandResult(payload: CommandResultPayload) {

    const commandId = payload?.commandId?.trim();
    if (!commandId) {
      return;
    }

    const command = await this.prisma.command.findUnique({
      where: { commandId },
    });
    if (!command) {
      return;
    }


    // Обновляем только при успешном выполнении
    if ((payload.status ?? '').toLowerCase() !== 'completed') {
      return;
    }

    if (!command.cellId) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const cell = await tx.cell.findUnique({
        where: { id: command.cellId },
        select: { currentRentId: true },
      });
      const isClose = (command.action ?? '').toLowerCase() === 'completed';
      if (isClose) {
        // завершение: rent -> COMPLETED, cell -> FREE/null rent
        if (cell?.currentRentId) {
          await tx.rent.update({
            where: { id: cell.currentRentId },
            data: {
              status: this.rentCompleted,
              finishedAt: new Date(),
              userId: command.userId ?? undefined,
              itemId: command.itemId ?? undefined,
            },
          });
        } else if (command.rentId) {
          await tx.rent.update({
            where: { id: command.rentId },
            data: {
              status: this.rentCompleted,
              finishedAt: new Date(),
              userId: command.userId ?? undefined,
              itemId: command.itemId ?? undefined,
            },
          });
        }

        await tx.cell.update({
          where: { id: command.cellId },
          data: {
            status: 'FREE',
            currentRentId: null,
          },
        });
      } else {
        // open: всегда создаём новый rent
        const newRent = await tx.rent.create({
          data: {
            cellId: command.cellId,
            userId: command.userId ?? undefined,
            itemId: command.itemId ?? undefined,
            status: 'ACTIVE',
            startedAt: new Date(),
          },
        });
        command.rentId = newRent.id;

        await tx.cell.update({
          where: { id: command.cellId },
          data: {
            status: 'OCCUPIED',
            currentRentId: command.rentId ?? cell?.currentRentId ?? null,
          },
        });
      }

      await tx.command.update({
        where: { commandId },
        data: {
          status: this.rentCompleted,
          finishedAt: new Date(),
          rentId: command.rentId ?? undefined,
        },
      });
    });
  }

  private findConnection(socket: WebSocket): Connection | undefined {
    for (const conn of this.connectionsByCode.values()) {
      if (conn.socket === socket) {
        return conn;
      }
    }
    return undefined;
  }

  private findById(id: string): Connection | undefined {
    for (const conn of this.connectionsByCode.values()) {
      if (conn.dbId === id) {
        return conn;
      }
    }
    return undefined;
  }
}

export type SendGpioCommandInput = {
  gpioPin: number;
  durationSeconds?: number;
  commandId?: string;
};

export type OpenCellInput = {
  cellId?: string;
  index?: number;
  durationSeconds?: number;
  commandId?: string;
  userId?: string | null;
  itemId?: string | null;
};

export type CommandResultPayload = {
  commandId?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
};
