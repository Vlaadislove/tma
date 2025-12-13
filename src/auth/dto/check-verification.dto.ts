import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CheckVerificationDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  sessionToken: string;
}
