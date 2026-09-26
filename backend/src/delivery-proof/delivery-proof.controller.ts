import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { Role } from '../auth/enums/role.enum';
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
  @RequirePermissions(Permission.DELIVERY_PROOF_UPLOAD)
  uploadPhoto(
    @Param('orderId') orderId: string,
    @Body() dto: UploadPhotoDto,
    @Req() req: Request,
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
