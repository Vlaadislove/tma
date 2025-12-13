import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'http';
import {
  TerminalsService,
  type TerminalStatePayload,
  type CommandResultPayload,
} from './terminals.service';
import type { WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  path: '/terminals',
  cors: {
    origin: [
      // '*',
      // 'http://localhost:5173',
      // 'https://assuring-strangely-flamingo.ngrok-free.app',
    ],
    credentials: true,
  },
})
export class TerminalsGateway
  implements OnGatewayConnection<WebSocket>, OnGatewayDisconnect<WebSocket> {
  private readonly logger = new Logger(TerminalsGateway.name);

  constructor(
    private readonly terminalsService: TerminalsService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage) {

    const { code, id } = this.extractTerminalParams(request);

    if (!code) {
      this.logger.warn('Connection rejected: missing terminal code');
      client.close(1008, 'terminal code is required');
      return;
    }

    const terminal = await this.prisma.terminal.findUnique({
      where: { code },
    });

    if (!terminal) {
      this.logger.warn(`Unknown terminal: ${code}`);
      client.close(1008, 'terminalId is not registered');
      return;
    }
    if (id && terminal.id !== id) {
      this.logger.warn(`Terminal id mismatch for code ${code}`);
      client.close(1008, 'terminal id mismatch');
      return;
    }

    this.logger.log(`Terminal connected: ${code}`);
    this.terminalsService.register(code, terminal.id, client);
  }

  handleDisconnect(client: WebSocket) {
    const terminalCode = this.terminalsService.unregister(client);
    if (terminalCode) {
      this.logger.log(`Terminal disconnected: ${terminalCode}`);
    }
  }

  @SubscribeMessage('terminal-state')
  handleTerminalState(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: TerminalStatePayload,
  ) {
    this.terminalsService.updateState(client, payload);
  }

  @SubscribeMessage('command-ack')
  handleCommandAck(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: unknown,
  ) {
    this.terminalsService.touch(client, payload);
  }

  @SubscribeMessage('command-result')
  async handleCommandResult(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: CommandResultPayload,
  ) {
    this.terminalsService.touch(client, payload);
    await this.terminalsService.handleCommandResult(payload);
  }

  private extractTerminalParams(
    request: IncomingMessage,
  ): { code: string | null; id: string | null } {
    const url = request.url ?? '';
    try {
      const parsed = new URL(url, 'http://localhost');
      const code = parsed.searchParams.get('code');
      const id = parsed.searchParams.get('terminalId');

      return {
        code: code ? code.trim() : null,
        id: id ? id.trim() : null,
      };
    } catch {
      return { code: null, id: null };
    }
  }
}
