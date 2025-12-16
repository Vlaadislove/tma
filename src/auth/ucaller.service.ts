import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class UcallerService {
  private readonly apiUrl = 'https://api.ucaller.ru/v1.0/inboundCallWaiting';
  private readonly key: string;
  private readonly serviceId: string;
  private readonly callbackUrl: string;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('UCALLER_TOKEN');
    const serviceId = this.configService.get<string>('UCALLER_SERVICE_ID');
    const callbackUrl = this.configService.get<string>('CALLBACK_URL');

    if (!token) {
      throw new Error('UCALLER_TOKEN is not defined in environment variables');
    }
    if (!serviceId) {
      throw new Error('UCALLER_SERVICE_ID is not defined in environment variables');
    }
    if (!callbackUrl) {
      throw new Error('CALLBACK_URL is not defined in environment variables');
    }

    this.key = token;
    this.serviceId = serviceId;
    this.callbackUrl = callbackUrl;
  }

  async initiateCall(phone: string) {

    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          phone: phone,
          callback_url: this.callbackUrl,
          key: this.key,
          service_id: this.serviceId,
        },
      });

      return {
        callId: response.data.ucaller_id.toString(),
        confirmationNumber: response.data.confirmation_number, 
      };
    } catch (error) {
      throw new Error(`Ошибка при инициировании звонка: ${error.message}`);
    }
  }
}
