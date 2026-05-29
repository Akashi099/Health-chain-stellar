/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { OrganizationReviewModerationLogEntity } from '../entities/organization-review-moderation-log.entity';
import { OrganizationReviewReportEntity } from '../entities/organization-review-report.entity';
import { OrganizationReviewEntity } from '../entities/organization-review.entity';
import { OrganizationEntity } from '../entities/organization.entity';
import { ReviewModerationAction } from '../enums/review-moderation-action.enum';
import { ReviewModerationStatus } from '../enums/review-moderation-status.enum';

import { OrganizationReviewsService } from './organization-reviews.service';

describe('OrganizationReviewsService', () => {
  let service: OrganizationReviewsService;

  const organizationRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  const reviewRepo = {
    findOne: jest.fn(),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ ...v, id: v.id ?? 'review-1' })),
    remove: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  const reportRepo = {
    findOne: jest.fn(),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ ...v, id: 'report-1' })),
  };

  const moderationLogRepo = {
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ ...v, id: 'log-1' })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    queryBuilder.getRawOne.mockResolvedValue({ avg: '4.50', count: '2' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationReviewsService,
        {
          provide: getRepositoryToken(OrganizationEntity),
          useValue: organizationRepo,
        },
        {
          provide: getRepositoryToken(OrganizationReviewEntity),
          useValue: reviewRepo,
        },
        {
          provide: getRepositoryToken(OrganizationReviewReportEntity),
          useValue: reportRepo,
        },
        {
          provide: getRepositoryToken(OrganizationReviewModerationLogEntity),
          useValue: moderationLogRepo,
        },
      ],
    }).compile();

    service = module.get<OrganizationReviewsService>(
      OrganizationReviewsService,
    );
  });

  it('submits review with valid rating and sanitizes text', async () => {
    organizationRepo.findOne.mockResolvedValue({ id: 'org-1' });
    reviewRepo.findOne.mockResolvedValueOnce(null);

    const result = await service.submitReview('org-1', 'user-1', {
      rating: 5,
      review: '<script>bad()</script> Excellent service',
    });

    expect(result.data.reviewText).toBe('bad() Excellent service');
    expect(reviewRepo.save).toHaveBeenCalled();
    expect(organizationRepo.update).toHaveBeenCalledWith('org-1', {
      rating: 4.5,
      reviewCount: 2,
    });
  });

  it('prevents duplicate review per user and organization', async () => {
    organizationRepo.findOne.mockResolvedValue({ id: 'org-1' });
    reviewRepo.findOne.mockResolvedValueOnce({ id: 'existing-review' });

    await expect(
      service.submitReview('org-1', 'user-1', { rating: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns paginated review query results', async () => {
    organizationRepo.findOne.mockResolvedValue({ id: 'org-1' });
    reviewRepo.findAndCount.mockResolvedValue([
      [{ id: 'review-1', rating: 5 }],
      1,
    ]);

    const result = await service.getReviewsForOrganization('org-1', {
      page: 1,
      limit: 10,
      sort: 'newest',
    });

    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('flags review when report threshold is reached', async () => {
    reviewRepo.findOne.mockResolvedValue({
      id: 'review-1',
      organizationId: 'org-1',
      reportCount: 2,
      moderationStatus: ReviewModerationStatus.VISIBLE,
      isFlagged: false,
      isHidden: false,
    });
    reportRepo.findOne.mockResolvedValue(null);

    const result = await service.reportReview('review-1', 'reporter-1', {
      reason: 'Abusive language',
    });

    expect(result.data.autoFlagged).toBe(true);
    expect(reviewRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        moderationStatus: ReviewModerationStatus.FLAGGED,
        isFlagged: true,
        isHidden: true,
      }),
    );
  });

  it('prevents duplicate report by same user', async () => {
    reviewRepo.findOne.mockResolvedValue({
      id: 'review-1',
      organizationId: 'org-1',
      reportCount: 0,
      moderationStatus: ReviewModerationStatus.VISIBLE,
      isFlagged: false,
      isHidden: false,
    });
    reportRepo.findOne.mockResolvedValue({ id: 'existing-report' });

    await expect(
      service.reportReview('review-1', 'reporter-1', { reason: 'spam' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('supports admin moderation state transitions', async () => {
    reviewRepo.findOne.mockResolvedValue({
      id: 'review-1',
      organizationId: 'org-1',
      reportCount: 1,
      moderationStatus: ReviewModerationStatus.FLAGGED,
      isFlagged: true,
      isHidden: true,
    });

    const result = await service.moderateReview('review-1', 'admin-1', {
      action: ReviewModerationAction.APPROVE,
      reason: 'Reviewed and valid',
    });

    expect(result.data.moderationStatus).toBe(ReviewModerationStatus.VISIBLE);
    expect(moderationLogRepo.save).toHaveBeenCalled();
  });

  it('prevents deletion by unauthorized user', async () => {
    reviewRepo.findOne.mockResolvedValue({
      id: 'review-1',
      organizationId: 'org-1',
      reviewerId: 'owner-1',
    });

    await expect(
      service.deleteReview('review-1', 'other-user', 'hospital'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows deletion by review owner', async () => {
    reviewRepo.findOne.mockResolvedValue({
      id: 'review-1',
      organizationId: 'org-1',
      reviewerId: 'owner-1',
    });

    const result = await service.deleteReview('review-1', 'owner-1', 'donor');

    expect(result.data.id).toBe('review-1');
    expect(reviewRepo.remove).toHaveBeenCalled();
  });

  it('throws if organization is missing when querying reviews', async () => {
    organizationRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getReviewsForOrganization('missing-org', { page: 1, limit: 10 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
