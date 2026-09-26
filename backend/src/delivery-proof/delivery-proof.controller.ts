import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { CreateDeliveryProofDto } from './dto/create-delivery-proof.dto';
import { DeliveryProofQueryDto } from './dto/delivery-proof-query.dto';
import { DeliveryProofService } from './delivery-proof.service';
import {
  CreateDeliveryProofDto,
  QueryDeliveryProofDto,
  UploadPhotoDto,
} from './dto/delivery-proof.dto';

interface AuthenticatedUser {
  id: string;
  role: Role;
  permissions?: Permission[];
}

@Controller('delivery-proofs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveryProofController {
  constructor(private readonly deliveryProofService: DeliveryProofService) {}

  @Post()
  @RequirePermissions(Permission.DELIVERY_PROOF_CREATE)
  create(@Body() dto: CreateDeliveryProofDto, @Req() req: Request) {
    return this.deliveryProofService.create(dto, req.user as AuthenticatedUser);
  }

  @Post(':orderId/upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadPhoto(
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @UploadedFile() file: any, // Express.Multer.File
  ) {
    return this.deliveryProofService.uploadPhoto(
      orderId,
      dto,
      req.user as AuthenticatedUser,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.DELIVERY_PROOF_READ)
  getOne(@Param('id') id: string, @Req() req: Request) {
    return this.deliveryProofService.getOne(id, req.user as AuthenticatedUser);
  }

  @Get()
  @RequirePermissions(Permission.DELIVERY_PROOF_READ)
  query(@Query() query: QueryDeliveryProofDto, @Req() req: Request) {
    return this.deliveryProofService.query(query, req.user as AuthenticatedUser);
  }

  @Get('rider/:riderId')
  @RequirePermissions(Permission.DELIVERY_PROOF_READ)
  byRider(@Param('riderId') riderId: string, @Req() req: Request) {
    return this.deliveryProofService.byRider(
      riderId,
      req.user as AuthenticatedUser,
    );
  }

  @Get('request/:requestId')
  @RequirePermissions(Permission.DELIVERY_PROOF_READ)
  byRequest(@Param('requestId') requestId: string, @Req() req: Request) {
    return this.deliveryProofService.byRequest(
      requestId,
      req.user as AuthenticatedUser,
    );
  }

  @Get('statistics')
  @RequirePermissions(Permission.DELIVERY_PROOF_READ)
  statistics(@Req() req: Request) {
    return this.deliveryProofService.statistics(req.user as AuthenticatedUser);
  }
}
