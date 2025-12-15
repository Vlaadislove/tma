import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import https from 'https';

@Injectable()
export class UcallerService {
  private readonly apiUrl = 'https://api.ucaller.ru/v1.0/inboundCallWaiting';
  private readonly key: string;
  private readonly serviceId: string;
  private readonly callbackUrl: string;

  private readonly httpsAgent = new https.Agent({ keepAlive: false });

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('UCALLER_TOKEN');
    const serviceId = this.configService.get<string>('UCALLER_SERVICE_ID');
    const callbackUrl = this.configService.get<string>('CALLBACK_URL');

    if (!token) throw new Error('UCALLER_TOKEN is not defined');
    if (!serviceId) throw new Error('UCALLER_SERVICE_ID is not defined');
    if (!callbackUrl) throw new Error('CALLBACK_URL is not defined');

    this.key = token;
    this.serviceId = serviceId;
    this.callbackUrl = callbackUrl;
  }

  async initiateCall(phone: string) {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          phone,
          callback_url: this.callbackUrl,
          key: this.key,
          service_id: this.serviceId,
        },
        timeout: 8000,
        httpsAgent: this.httpsAgent,
        validateStatus: () => true,
      });

      if (response.status >= 400) {
        throw new ServiceUnavailableException(
          `UCaller ответил ${response.status}: ${JSON.stringify(response.data)}`
        );
      }

      return {
        callId: String(response.data.ucaller_id),
        confirmationNumber: response.data.confirmation_number,
      };
    } catch (e: any) {
      // ВАЖНО: покажем код и статус, чтобы было понятно, что именно происходит
      const code = e?.code;
      const status = e?.response?.status;
      const data = e?.response?.data;

      throw new ServiceUnavailableException(
        `UCaller error: code=${code || 'n/a'} status=${status || 'n/a'} data=${data ? JSON.stringify(data) : 'n/a'} message=${e?.message}`
      );
    }
  }
}
