# Docker Setup

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2+
- [Node.js](https://nodejs.org/) 18+ (backend)
- [Rust](https://www.rust-lang.org/tools/install) + [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) (contracts only)

## Services

`docker-compose up -d` starts two services:

| Service  | Image              | Port | Description          |
|----------|--------------------|------|----------------------|
| postgres | postgres:16-alpine | 5432 | Primary database     |
| redis    | redis:7-alpine     | 6379 | Cache / job queues   |

## Default Credentials

| Variable            | Default value  |
|---------------------|----------------|
| `POSTGRES_USER`     | `postgres`     |
| `POSTGRES_PASSWORD` | `postgres`     |
| `POSTGRES_DB`       | `healthchain`  |

Override any value by creating a `.env` file in the repo root before running `docker-compose up`:

```bash
cp backend/.env.example backend/.env
# edit backend/.env with your values
```

Docker Compose will pick up a root-level `.env` automatically for compose variables; backend env vars are read by the NestJS app from `backend/.env`.

## Start the Stack

```bash
docker-compose up -d
```

## Verify the Stack is Healthy

```bash
docker-compose ps
```

Both services should show `healthy`. You can also test directly:

```bash
# Postgres
docker exec healthchain-postgres pg_isready -U postgres

# Redis
docker exec healthchain-redis redis-cli ping   # expected: PONG
```

## Optional Dev Tools

These services are gated behind the `tools` profile and are not started by default:

| Service         | Port | Description                        |
|-----------------|------|------------------------------------|
| redis-commander | 8081 | Web UI for browsing Redis keys     |
| bull-board      | 3001 | Web UI for monitoring Bull queues  |

Start them alongside the core stack:

```bash
docker-compose --profile tools up -d
```

## Troubleshooting

**Port already in use**
Another process is using 5432 or 6379. Stop it or change the host-side port in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"   # map to a free host port
```
Update `DATABASE_PORT` / `REDIS_PORT` in `backend/.env` to match.

**Container exits immediately**
Check logs for the failing service:
```bash
docker-compose logs postgres
docker-compose logs redis
```

**Postgres `password authentication failed`**
The volume may hold data from a previous run with different credentials. Remove it and restart:
```bash
docker-compose down -v
docker-compose up -d
```

**Reset everything**
```bash
docker-compose down -v --remove-orphans
```
