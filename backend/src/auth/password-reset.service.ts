import { randomBytes } from 'crypto';

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import * as nodemailer from 'nodemailer';
import { Repository, MoreThan } from 'typeorm';

import { UserEntity } from '../users/entities/user.entity';

import { EmailVerificationEntity } from './entities/email-verification.entity';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { hashPassword } from './utils/password.util';

const RESET_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const VERIFY_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_RATE_LIMIT_MS = 60 * 1000; // 1 request per minute

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly resetTokenRepository: Repository<PasswordResetTokenEntity>,
    @InjectRepository(EmailVerificationEntity)
    private readonly verificationRepository: Repository<EmailVerificationEntity>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  /** Send verification email after registration */
  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + VERIFY_EXPIRY_MS);

    await this.verificationRepository.save(
      this.verificationRepository.create({ userId, token, expiresAt }),
    );

    const verifyUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/api/v1/auth/verify-email?token=${token}`;

    await this.sendMail(email, 'Verify your email', `Click to verify: ${verifyUrl}`);
  }

  /** Verify email with token */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const record = await this.verificationRepository.findOne({
      where: { token, used: false, expiresAt: MoreThan(new Date()) },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userRepository.update(record.userId, { emailVerified: true });
    await this.verificationRepository.update(record.id, { used: true });

    return { message: 'Email verified successfully' };
  }

  /** Resend verification email */
  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) throw new BadRequestException('Email already verified');

    await this.sendVerificationEmail(userId, user.email);
    return { message: 'Verification email sent' };
  }

  /** Request password reset — rate limited */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link was sent' };

    // Rate limit: check for recent token
    const recentToken = await this.resetTokenRepository.findOne({
      where: {
        userId: user.id,
        used: false,
        createdAt: MoreThan(new Date(Date.now() - RESET_RATE_LIMIT_MS)),
      },
    });

    if (recentToken) {
      return { message: 'If that email exists, a reset link was sent' };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS);

    await this.resetTokenRepository.save(
      this.resetTokenRepository.create({ userId: user.id, token, expiresAt }),
    );

    const resetUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/reset-password?token=${token}`;
    await this.sendMail(user.email, 'Reset your password', `Click to reset: ${resetUrl}`);

    return { message: 'If that email exists, a reset link was sent' };
  }

  /** Reset password with token */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const record = await this.resetTokenRepository.findOne({
      where: { token, used: false, expiresAt: MoreThan(new Date()) },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.userRepository.update(record.userId, { passwordHash });
    await this.resetTokenRepository.update(record.id, { used: true });

    return { message: 'Password reset successfully' };
  }

  private async sendMail(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', 'noreply@healthchain.io'),
        to,
        subject,
        text,
      });
    } catch (err) {
      this.logger.warn(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }
}
