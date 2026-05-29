# Auth Session Retention Policy

## Overview

The auth session persistence system maintains a database-backed audit trail of all authentication sessions. This document outlines the retention policy and cleanup procedures.

## Session Lifecycle

### Session States

1. **Active**: Session is valid and in use
   - `isActive: true`
   - `revokedAt: null`
   - User can authenticate with this session

2. **Expired**: Session has reached its expiration time
   - `expiresAt < now()`
   - Automatically cleaned up by retention policy
   - No longer valid for authentication

3. **Revoked**: Session was explicitly invalidated
   - `isActive: false`
   - `revokedAt: timestamp`
   - `revocationReason: string` (optional)
   - Retained for audit purposes

## Retention Rules

### Active Sessions
- **Retention Period**: Duration of session TTL (default: 7 days)
- **Cleanup**: Automatic deletion when expired
- **Trigger**: Scheduled job runs daily at 2 AM UTC

### Revoked Sessions
- **Retention Period**: 90 days after revocation
- **Purpose**: Audit trail and security investigation
- **Cleanup**: Automatic deletion after 90 days
- **Trigger**: Scheduled job runs daily at 2 AM UTC

### Session Audit Log
- **Retention Period**: 180 days
- **Purpose**: Compliance and security analysis
- **Accessible via**: `AuthSessionRepository.getAuditLog(userId, limit)`

## Cleanup Operations

### Automatic Cleanup (Scheduled)

```typescript
// Runs daily at 2 AM UTC
async cleanupExpiredSessions(): Promise<void> {
  const deletedCount = await this.authSessionRepository.deleteExpiredSessions();
  this.logger.log(`Deleted ${deletedCount} expired sessions`);
}

async cleanupRevokedSessions(): Promise<void> {
  const deletedCount = await this.authSessionRepository.deleteRevokedSessionsOlderThan(90);
  this.logger.log(`Deleted ${deletedCount} revoked sessions older than 90 days`);
}
```

### Manual Cleanup

```typescript
// Revoke all sessions for a user (e.g., password change)
await this.authSessionRepository.revokeUserSessions(
  userId,
  'Password changed'
);

// Revoke specific session
await this.authSessionRepository.revokeSession(
  sessionId,
  'User logout'
);
```

## Configuration

### Environment Variables

```env
# Session TTL in seconds (default: 604800 = 7 days)
JWT_REFRESH_EXPIRES_IN=604800

# Max concurrent sessions per user (default: 3)
MAX_CONCURRENT_SESSIONS=3

# Session cleanup schedule (cron format)
SESSION_CLEANUP_SCHEDULE=0 2 * * * # 2 AM UTC daily
```

## Compliance Considerations

### GDPR
- Sessions are tied to user accounts
- User deletion triggers session cleanup
- Audit logs retained for 180 days for compliance

### Security
- Revoked sessions retained for investigation
- IP address and user agent logged for anomaly detection
- Last activity timestamp enables idle session detection

### Audit Trail
- All session creation/revocation events logged
- Timestamps in UTC for consistency
- Reason for revocation recorded

## Monitoring

### Key Metrics

```typescript
// Get session statistics
const stats = await this.authSessionRepository.getSessionStats(userId);
// Returns: { activeCount: 2, totalCount: 15 }

// Get audit log
const auditLog = await this.authSessionRepository.getAuditLog(userId, 50);
// Returns: Last 50 sessions for user
```

### Alerts

- Alert if user has > 10 active sessions
- Alert if session creation rate > 100/hour
- Alert if revocation rate > 50/hour

## Database Indexes

The following indexes optimize session queries:

- `IDX_AUTH_SESSION_SESSION_ID`: Fast session lookup
- `IDX_AUTH_SESSION_USER_ID`: User session queries
- `IDX_AUTH_SESSION_USER_ID_ACTIVE`: Active sessions per user
- `IDX_AUTH_SESSION_EXPIRES_AT`: Cleanup queries
- `IDX_AUTH_SESSION_CREATED_AT`: Audit log queries
- `IDX_AUTH_SESSION_USER_CREATED_AT`: User session history

## Integration with Auth Service

The `AuthService` automatically:

1. Creates session record on login
2. Updates last activity on token refresh
3. Revokes session on logout
4. Revokes all sessions on password change
5. Enforces concurrent session limits

## Example Usage

```typescript
// In auth.service.ts
async login(loginDto: { email: string; password: string }) {
  // ... validate credentials ...

  const sessionId = randomBytes(16).toString('hex');
  
  // Create persistent session record
  await this.authSessionRepository.create({
    sessionId,
    userId: user.id,
    email: user.email,
    role: user.role,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });

  // ... issue tokens ...
}

async logout(sessionId: string) {
  await this.authSessionRepository.revokeSession(sessionId, 'User logout');
}
```

## Future Enhancements

- [ ] Session activity dashboard
- [ ] Anomaly detection (unusual login patterns)
- [ ] Device fingerprinting
- [ ] Geographic location tracking
- [ ] Real-time session revocation across devices
