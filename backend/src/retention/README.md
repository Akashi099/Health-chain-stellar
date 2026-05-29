# Data Retention Job

## Overview

The retention job automatically cleans up stale sessions and old activity logs to maintain database and Redis performance. It runs as a scheduled cron job and can also be triggered manually via API.

## Features

- **Automatic Scheduling**: Runs daily at 2 AM UTC by default
- **Configurable Retention Periods**: Customize how long to keep sessions and activity logs
- **Manual Triggering**: Admin endpoint to run cleanup on-demand
- **Comprehensive Logging**: Detailed logs of cleanup operations
- **Minimal Performance Impact**: Uses efficient batch operations

## Configuration

Add these environment variables to your `.env` file:

```env
# Cron expression for retention job (default: 0 2 * * * = 2 AM UTC daily)
RETENTION_JOB_CRON=0 2 * * *

# Session retention period in days (default: 30)
RETENTION_SESSION_TTL_DAYS=30

# Activity log retention period in days (default: 90)
RETENTION_ACTIVITY_LOG_DAYS=90
```

### Cron Expression Format

The `RETENTION_JOB_CRON` uses standard cron syntax:

```
┌───────────── second (0 - 59)
│ ┌───────────── minute (0 - 59)
│ │ ┌───────────── hour (0 - 23)
│ │ │ ┌───────────── day of month (1 - 31)
│ │ │ │ ┌───────────── month (1 - 12)
│ │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │ │
│ │ │ │ │ │
* * * * * *
```

**Examples:**
- `0 2 * * *` - Every day at 2 AM UTC
- `0 0 * * 0` - Every Sunday at midnight UTC
- `0 */6 * * *` - Every 6 hours
- `0 3 * * 1-5` - Weekdays at 3 AM UTC

## What Gets Cleaned

### Sessions (Redis)

Deletes sessions that meet any of these criteria:
- Expired (based on `expiresAt` timestamp)
- Older than `RETENTION_SESSION_TTL_DAYS`

**Storage**: Redis hash keys matching `auth:session:*`

### Activity Logs (PostgreSQL)

Deletes activity log records older than `RETENTION_ACTIVITY_LOG_DAYS`.

**Table**: `user_activities`

## API Endpoint

### Manual Trigger

```http
POST /api/v1/retention/trigger
Authorization: Bearer <jwt_token>
```

**Requirements:**
- Admin role required
- Valid JWT token

**Response:**
```json
{
  "sessionsDeleted": 42,
  "logsDeleted": 156
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/retention/trigger \
  -H "Authorization: Bearer your_jwt_token"
```

## Monitoring

The retention job logs all operations:

```
[RetentionService] Starting retention job for stale sessions and activity logs
[RetentionService] Cleaned up 42 stale sessions
[RetentionService] Cleaned up 156 old activity logs
[RetentionService] Retention job completed: 42 sessions deleted, 156 activity logs deleted
```

## Performance Considerations

- **Session Cleanup**: Uses Redis SCAN to avoid blocking operations
- **Activity Log Cleanup**: Uses TypeORM batch delete for efficiency
- **Batch Size**: Sessions processed in batches of 100 keys
- **Recommended Schedule**: Run during low-traffic hours (e.g., 2 AM UTC)

## Best Practices

1. **Schedule During Off-Peak Hours**: Avoid peak traffic times
2. **Monitor Logs**: Check application logs for cleanup statistics
3. **Adjust Retention Periods**: Based on your compliance and storage requirements
4. **Test Configuration**: Verify cron expression before deploying to production
5. **Regular Audits**: Periodically review retention policies

## Troubleshooting

### Job Not Running

1. Verify `ScheduleModule` is imported in `AppModule`
2. Check that `RETENTION_JOB_CRON` is valid
3. Ensure Redis and database connections are healthy
4. Check application logs for errors

### High Memory Usage

- Reduce `RETENTION_SESSION_TTL_DAYS` to clean up sessions more frequently
- Reduce `RETENTION_ACTIVITY_LOG_DAYS` to keep fewer activity logs
- Increase batch size in `cleanupStaleSessions()` if Redis has sufficient memory

### Slow Cleanup

- Run during off-peak hours
- Increase batch size for session cleanup
- Consider running more frequently with shorter retention periods

## Testing

Run the retention service tests:

```bash
npm test -- retention.service.spec.ts
```

Manual testing:

```bash
# Trigger cleanup via API
curl -X POST http://localhost:3000/api/v1/retention/trigger \
  -H "Authorization: Bearer your_jwt_token"
```

## Related Documentation

- [User Activity Logging](../user-activity/README.md)
- [Authentication & Sessions](../auth/README.md)
- [NestJS Schedule Module](https://docs.nestjs.com/techniques/task-scheduling)
