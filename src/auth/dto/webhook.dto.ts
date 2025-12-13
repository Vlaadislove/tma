import { IsString, IsNotEmpty } from 'class-validator';

export class WebhookDto {
  @IsString()
  @IsNotEmpty()
  callId: string;

  @IsString()
  @IsNotEmpty()
  clientNumber: string;

  @IsString()
  @IsNotEmpty()
  confirmationNumber: string;
}
