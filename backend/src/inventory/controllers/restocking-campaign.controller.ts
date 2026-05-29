import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { RestockingCampaignService } from '../services/restocking-campaign.service';

@Controller('inventory/campaigns')
export class RestockingCampaignController {
  constructor(private readonly campaignService: RestockingCampaignService) {}

  @RequirePermissions(Permission.MANAGE_INVENTORY)
  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.createCampaign(dto);
  }

  @RequirePermissions(Permission.MANAGE_INVENTORY)
  @Get()
  list(@Query('bloodBankId') bloodBankId?: string) {
    return this.campaignService.listCampaigns(bloodBankId);
  }

  @RequirePermissions(Permission.MANAGE_INVENTORY)
  @Post(':id/convert')
  recordConversion(@Param('id') id: string) {
    return this.campaignService.recordConversion(id);
  }
}
