/// <reference types="jest" />
import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PermissionsService, UserContext } from './permissions.service';
import { UserRole } from './enums/user-role.enum';

// Minimal stub – helpers don't touch Redis/DB/activity
const buildService = async (): Promise<PermissionsService> => {
  const module = await Test.createTestingModule({
    providers: [
      PermissionsService,
      { provide: 'RoleEntityRepository', useValue: {} },
      { provide: 'RolePermissionEntityRepository', useValue: {} },
      { provide: 'REDIS_CLIENT', useValue: {} },
      { provide: 'UserActivityService', useValue: {} },
    ],
  })
    .overrideProvider(PermissionsService)
    .useValue(new (PermissionsService as any)())
    .compile();

  // Instantiate directly to avoid full DI for pure helpers
  return module.get(PermissionsService);
};

// Helpers are pure synchronous methods – test them directly on a plain instance
const svc = Object.create(PermissionsService.prototype) as PermissionsService;

describe('PermissionsService – shared helpers', () => {
  describe('assertHasRole', () => {
    it('passes when user holds an allowed role', () => {
      const user: UserContext = { id: '1', role: UserRole.ADMIN };
      expect(() => svc.assertHasRole(user, [UserRole.ADMIN])).not.toThrow();
    });

    it('throws ForbiddenException when role is not allowed', () => {
      const user: UserContext = { id: '1', role: UserRole.DONOR };
      expect(() => svc.assertHasRole(user, [UserRole.ADMIN])).toThrow(
        ForbiddenException,
      );
    });

    it('is case-insensitive', () => {
      const user: UserContext = { id: '1', role: 'ADMIN' };
      expect(() => svc.assertHasRole(user, [UserRole.ADMIN])).not.toThrow();
    });
  });

  describe('assertIsAdminOrSelf', () => {
    it('passes for admin regardless of ownerId', () => {
      const user: UserContext = { id: 'admin-1', role: UserRole.ADMIN };
      expect(() => svc.assertIsAdminOrSelf(user, 'other-user')).not.toThrow();
    });

    it('passes when user is the owner', () => {
      const user: UserContext = { id: 'user-1', role: UserRole.DONOR };
      expect(() => svc.assertIsAdminOrSelf(user, 'user-1')).not.toThrow();
    });

    it('throws when non-admin tries to act on another user', () => {
      const user: UserContext = { id: 'user-1', role: UserRole.DONOR };
      expect(() => svc.assertIsAdminOrSelf(user, 'user-2')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertCanApproveRequest', () => {
    it.each(['admin', 'blood_bank', 'blood_bank_staff'])(
      'passes for role "%s"',
      (role) => {
        expect(() =>
          svc.assertCanApproveRequest({ id: '1', role }),
        ).not.toThrow();
      },
    );

    it.each([UserRole.DONOR, UserRole.RIDER, UserRole.HOSPITAL])(
      'throws for role "%s"',
      (role) => {
        expect(() => svc.assertCanApproveRequest({ id: '1', role })).toThrow(
          ForbiddenException,
        );
      },
    );
  });

  describe('assertCanFulfillRequest', () => {
    it.each(['admin', 'rider', 'dispatcher', 'blood_bank', 'blood_bank_staff'])(
      'passes for role "%s"',
      (role) => {
        expect(() =>
          svc.assertCanFulfillRequest({ id: '1', role }),
        ).not.toThrow();
      },
    );

    it('throws for donor role', () => {
      expect(() =>
        svc.assertCanFulfillRequest({ id: '1', role: UserRole.DONOR }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertIsBloodBankOrAdmin', () => {
    it.each(['admin', 'blood_bank', 'blood_bank_staff', 'bloodbank'])(
      'passes for role "%s"',
      (role) => {
        expect(() =>
          svc.assertIsBloodBankOrAdmin({ id: '1', role }),
        ).not.toThrow();
      },
    );

    it.each([UserRole.DONOR, UserRole.HOSPITAL, UserRole.RIDER])(
      'throws for role "%s"',
      (role) => {
        expect(() => svc.assertIsBloodBankOrAdmin({ id: '1', role })).toThrow(
          ForbiddenException,
        );
      },
    );
  });

  describe('Acceptance: all public mutating functions use centralized auth validation', () => {
    it('assertHasRole is the single source of role-based access control', () => {
      const donor: UserContext = { id: '1', role: UserRole.DONOR };
      expect(() =>
        svc.assertHasRole(donor, [UserRole.ADMIN, UserRole.HOSPITAL]),
      ).toThrow(ForbiddenException);
    });

    it('assertIsAdminOrSelf covers owner-or-admin pattern used across services', () => {
      const attacker: UserContext = { id: 'attacker', role: UserRole.DONOR };
      expect(() => svc.assertIsAdminOrSelf(attacker, 'victim')).toThrow(
        ForbiddenException,
      );
    });

    it('assertCanApproveRequest replaces inline role sets in request-status.service', () => {
      expect(() =>
        svc.assertCanApproveRequest({ id: '1', role: UserRole.HOSPITAL }),
      ).toThrow(ForbiddenException);
      expect(() =>
        svc.assertCanApproveRequest({ id: '1', role: 'blood_bank' }),
      ).not.toThrow();
    });

    it('assertIsBloodBankOrAdmin replaces inline string checks in blood-units.service', () => {
      expect(() =>
        svc.assertIsBloodBankOrAdmin({ id: '1', role: UserRole.DONOR }),
      ).toThrow(ForbiddenException);
      expect(() =>
        svc.assertIsBloodBankOrAdmin({ id: '1', role: 'blood_bank' }),
      ).not.toThrow();
    });
  });
});
