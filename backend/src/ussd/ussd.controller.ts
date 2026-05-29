import { Controller, Post, Body } from '@nestjs/common';
import { UssdService } from './ussd.service';

class UssdRequestDto {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
}

@Controller('api/v1/ussd')
export class UssdController {
  constructor(private readonly ussdService: UssdService) {}

  @Post('callback')
  async handleUssdCallback(@Body() dto: UssdRequestDto): Promise<string> {
    return this.ussdService.handleUssdRequest(
      dto.sessionId,
      dto.phoneNumber,
      dto.text,
    );
  }
}
