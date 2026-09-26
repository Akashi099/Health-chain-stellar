import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';
import { Permission } from './enums/permission.enum';
import { Role } from './enums/role.enum';

interface AuthenticatedUser {
  id: string;
  role: Role;
  permissions?: Permission[];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('No authenticated user found');
    }

    // Admin bypasses granular permission checks.
    if (user.role === Role.ADMIN) {
      return true;
    }

    const granted = new Set<Permission>(user.permissions ?? []);
    const missing = requiredPermissions.filter((p) => !granted.has(p));

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required permission(s): ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
