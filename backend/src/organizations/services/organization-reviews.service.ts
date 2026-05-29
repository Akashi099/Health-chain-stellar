import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { PermissionsService } from '../../auth/permissions.service';
import { NotificationChannel } from '../../notifications/enums/notification-channel.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateOrganizationReviewDto } from '../dto/create-organization-review.dto';
import { ModerateOrganizationReviewDto } from '../dto/moderate-organization-review.dto';
import { OrganizationReviewQueryDto } from '../dto/organization-review-query.dto';
import { ReportOrganizationReviewDto } from '../dto/report-organization-review.dto';
import { OrganizationReviewModerationLogEntity } from '../entities/organization-review-moderation-log.entity';
import { OrganizationReviewReportEntity } from '../entities/organization-review-report.entity';
import { OrganizationReviewEntity } from '../entities/organization-review.entity';
import { OrganizationEntity } from '../entities/organization.entity';
import { ReviewModerationAction } from '../enums/review-moderation-action.enum';
import { ReviewModerationStatus } from '../enums/review-moderation-status.enum';

const AUTO_FLAG_REPORT_THRESHOLD = 3;

@Injectable()
export class OrganizationReviewsService {
  private readonly logger = new Logger(OrganizationReviewsService.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepo: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationReviewEntity)
    private readonly reviewRepo: Repository<OrganizationReviewEntity>,
    @InjectRepository(OrganizationReviewReportEntity)
    private readonly reportRepo: Repository<OrganizationReviewReportEntity>,
    @InjectRepository(OrganizationReviewModerationLogEntity)
    private readonly moderationLogRepo: Repository<OrganizationReviewModerationLogEntity>,
    private readonly permissionsService: PermissionsService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async submitReview(
    organizationId: string,
    reviewerId: string,
    dto: CreateOrganizationReviewDto,
  ) {
    await this.findOrganizationOrFail(organizationId);
    await this.assertNoDuplicateReview(organizationId, reviewerId);

    const sanitizedReview = this.sanitizeReview(dto.review);

    const entity = this.reviewRepo.create({
      organizationId,
      reviewerId,
      rating: dto.rating,
      reviewText: sanitizedReview,
      moderationStatus: ReviewModerationStatus.VISIBLE,
      isFlagged: false,
      isHidden: false,
      reportCount: 0,
    });

    const saved = await this.reviewRepo.save(entity);
    await this.recalculateOrganizationRating(organizationId);
    await this.tryNotifyOrganizationOwner(organizationId, saved.id);

    return {
      message: 'Review submitted successfully',
      data: saved,
    };
  }

  async getReviewsForOrganization(
    organizationId: string,
    query: OrganizationReviewQueryDto,
  ) {
    await this.findOrganizationOrFail(organizationId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const order =
      query.sort === 'highestRated'
        ? ({ rating: 'DESC', createdAt: 'DESC' } as const)
        : ({ createdAt: 'DESC' } as const);

    const [items, total] = await this.reviewRepo.findAndCount({
      where: {
        organizationId,
        isHidden: false,
        moderationStatus: ReviewModerationStatus.VISIBLE,
      },
      order,
      skip,
      take: limit,
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reportReview(
    reviewId: string,
    reporterId: string,
    dto: ReportOrganizationReviewDto,
  ) {
    const review = await this.findReviewOrFail(reviewId);

    const existing = await this.reportRepo.findOne({
      where: { reviewId, reporterId },
    });

    if (existing) {
      throw new ConflictException('You have already reported this review.');
    }

    const report = this.reportRepo.create({
      reviewId,
      reporterId,
      reason: this.sanitizeReview(dto.reason),
    });

    await this.reportRepo.save(report);

    review.reportCount += 1;

    if (review.reportCount >= AUTO_FLAG_REPORT_THRESHOLD) {
      review.isFlagged = true;
      review.isHidden = true;
      review.moderationStatus = ReviewModerationStatus.FLAGGED;
    }

    await this.reviewRepo.save(review);
    await this.recalculateOrganizationRating(review.organizationId);

    return {
      message: 'Review reported successfully',
      data: {
        reviewId: review.id,
        reportCount: review.reportCount,
        autoFlagged: review.moderationStatus === ReviewModerationStatus.FLAGGED,
      },
    };
  }

  async moderateReview(
    reviewId: string,
    adminUserId: string,
    dto: ModerateOrganizationReviewDto,
  ) {
    const review = await this.findReviewOrFail(reviewId);

    switch (dto.action) {
      case ReviewModerationAction.APPROVE:
      case ReviewModerationAction.RESTORE:
        review.isHidden = false;
        review.isFlagged = false;
        review.moderationStatus = ReviewModerationStatus.VISIBLE;
        break;
      case ReviewModerationAction.FLAG:
        review.isFlagged = true;
        review.isHidden = true;
        review.moderationStatus = ReviewModerationStatus.FLAGGED;
        break;
      case ReviewModerationAction.HIDE:
        review.isHidden = true;
        review.moderationStatus = ReviewModerationStatus.HIDDEN;
        break;
      case ReviewModerationAction.REJECT:
        review.isHidden = true;
        review.moderationStatus = ReviewModerationStatus.REJECTED;
        break;
      default:
        throw new BadRequestException('Unsupported moderation action.');
    }

    await this.reviewRepo.save(review);

    await this.moderationLogRepo.save(
      this.moderationLogRepo.create({
        reviewId,
        adminUserId,
        action: dto.action,
        reason: this.sanitizeReview(dto.reason),
      }),
    );

    await this.recalculateOrganizationRating(review.organizationId);

    return {
      message: 'Review moderation updated successfully',
      data: review,
    };
  }

  async deleteReview(reviewId: string, actorId: string, actorRole?: string) {
    const review = await this.findReviewOrFail(reviewId);

    this.permissionsService.assertIsAdminOrSelf(
      { id: actorId, role: actorRole ?? '' },
      review.reviewerId,
      'You are not allowed to delete this review.',
    );

    await this.reviewRepo.remove(review);
    await this.recalculateOrganizationRating(review.organizationId);

    return {
      message: 'Review deleted successfully',
      data: { id: reviewId },
    };
  }

  private async findOrganizationOrFail(
    id: string,
  ): Promise<OrganizationEntity> {
    const organization = await this.organizationRepo.findOne({ where: { id } });
    if (!organization) {
      throw new NotFoundException(`Organization '${id}' not found`);
    }
    return organization;
  }

  private async findReviewOrFail(
    id: string,
  ): Promise<OrganizationReviewEntity> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Review '${id}' not found`);
    }
    return review;
  }

  private async assertNoDuplicateReview(
    organizationId: string,
    reviewerId: string,
  ): Promise<void> {
    const existing = await this.reviewRepo.findOne({
      where: { organizationId, reviewerId },
    });

    if (existing) {
      throw new ConflictException(
        'Duplicate reviews are not allowed for the same organization.',
      );
    }
  }

  private sanitizeReview(value?: string): string | null {
    if (!value) {
      return null;
    }

    const withoutTags = value.replace(/<[^>]*>/g, '');

    const noControlChars = Array.from(withoutTags)
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      .join('');

    const sanitized = noControlChars.replace(/\s+/g, ' ').trim();

    return sanitized.length > 0 ? sanitized : null;
  }

  private async recalculateOrganizationRating(
    organizationId: string,
  ): Promise<void> {
    const aggregate = await this.reviewRepo
      .createQueryBuilder('review')
      .select('COALESCE(AVG(review.rating), 0)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.organization_id = :organizationId', { organizationId })
      .andWhere('review.is_hidden = :isHidden', { isHidden: false })
      .andWhere('review.moderation_status = :status', {
        status: ReviewModerationStatus.VISIBLE,
      })
      .getRawOne<{ avg: string; count: string }>();

    const nextAverage = Number(Number(aggregate?.avg ?? 0).toFixed(2));
    const nextCount = Number(aggregate?.count ?? 0);

    await this.organizationRepo.update(organizationId, {
      rating: nextAverage,
      reviewCount: nextCount,
    });
  }

  private async tryNotifyOrganizationOwner(
    organizationId: string,
    reviewId: string,
  ): Promise<void> {
    if (!this.notificationsService) {
      return;
    }

    try {
      await this.notificationsService.send({
        recipientId: organizationId,
        channels: [NotificationChannel.IN_APP],
        templateKey: 'organization.review.submitted',
        variables: { organizationId, reviewId },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Could not send organization review notification for ${organizationId}: ${message}`,
      );
    }
  }
}
