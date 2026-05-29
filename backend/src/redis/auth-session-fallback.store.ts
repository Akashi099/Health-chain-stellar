import { Injectable, Logger } from '@nestjs/common';

/**
 * In-memory fallback storage for auth sessions when Redis is unavailable.
 * Provides basic session management without persistence.
 * WARNING: Sessions are lost on service restart.
 */
@Injectable()
export class AuthSessionFallbackStore {
  private readonly logger = new Logger(AuthSessionFallbackStore.name);
  private sessions = new Map<string, Record<string, string>>();
  private userSessions = new Map<string, Set<string>>();

  async getSession(sessionId: string): Promise<Record<string, string> | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    // Check expiration
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  async setSession(
    sessionId: string,
    data: Record<string, string>,
    ttlSeconds: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    this.sessions.set(sessionId, { ...data, expiresAt });

    // Auto-cleanup after TTL
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, ttlSeconds * 1000);

    this.logger.debug(`Fallback session stored: ${sessionId}`);
  }

  async addUserSession(userId: string, sessionId: string): Promise<void> {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);
  }

  async getUserSessions(userId: string): Promise<string[]> {
    return Array.from(this.userSessions.get(userId) ?? []);
  }

  async removeUserSession(userId: string, sessionId: string): Promise<void> {
    this.userSessions.get(userId)?.delete(sessionId);
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.revokedAt = new Date().toISOString();
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async markTokenConsumed(token: string): Promise<boolean> {
    // Simple in-memory tracking of consumed tokens
    const key = `consumed:${token}`;
    if (this.sessions.has(key)) {
      return false; // Already consumed
    }
    this.sessions.set(key, { consumed: 'true' });
    return true;
  }
}
