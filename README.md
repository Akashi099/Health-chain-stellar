# Health-chain-stellar

HealthDonor Protocol is an open-source platform built on Stellar Soroban smart contracts that enables transparent health donations, secure fund escrow, and immutable healthcare supply chain tracking.

The protocol is designed for blood donations, medical supplies, vaccines, and healthcare funding, ensuring that every donation is:

Traceable

Auditable

Released only when real-world conditions are met

🎯 Problem Statement

Healthcare donation systems today suffer from:

❌ Lack of transparency

❌ Centralized control and trust issues

❌ Poor donor visibility into impact

❌ Limited auditability of supply chains

Donors often cannot verify:

Where funds go

Whether supplies reach recipients

If medical standards are followed

✅ Solution

HealthDonor Protocol leverages Stellar + Soroban smart contracts to provide:

🔐 On-chain escrow for medical donations

📊 Donor impact tracking

🧾 Immutable healthcare supply chain events

🏥 Verified healthcare actor registry

🕒 Time-locked fund releases

🔒 Privacy-preserving donor identifiers

All critical actions are enforced by smart contracts, reducing fraud and manual intervention.

## Getting Started

### Prerequisites

| Dependency | Version | Purpose |
|---|---|---|
| Node.js | >= 18.x | Backend and frontend runtime |
| Docker + Docker Compose | latest | PostgreSQL (:5432) and Redis (:6379) |
| Rust + Cargo | stable | Soroban smart contracts |
| Stellar CLI (`stellar`) | >= 21.x | Deploy and invoke contracts |

### Quick Start

```bash
# 1. Start PostgreSQL and Redis
docker-compose up -d

# 2. Set up the backend
cd backend
cp .env.example .env   # edit DATABASE_PASSWORD, JWT_SECRET at minimum
npm install
npm run migration:run
npm run start:dev      # http://localhost:3001 — Swagger UI at /docs
```

```bash
# 3. Set up the frontend (separate terminal)
cd frontend/health-chain
npm install
npm run dev            # http://localhost:3000
```

For contract deployment, full environment variable reference, and contributor guidelines see **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

### Service Ports

| Service | Port |
|---|---|
| Next.js frontend | `:3000` |
| NestJS backend | `:3001` |
| Swagger UI | `:3001/docs` |
| PostgreSQL | `:5432` |
| Redis | `:6379` |

## Project Structure

| Directory | README |
|-----------|--------|
| `backend/` | [Backend README](./backend/README.md) |
| `contracts/` | [Contracts README](./contracts/README.md) |
| `lifebank-soroban/` | [Lifebank Soroban README](./lifebank-soroban/README.md) |
| `docs/contracts/` | [Contract Reference Docs](./docs/contracts/) |
| `docs/architecture.md` | [Architecture Diagram](./docs/architecture.md) |

## Handsoff notes

<!-- handsoff-issue-1291 -->
- #1291: [contracts/temperature] log_reading never emits an event for detected violations

<!-- handsoff-issue-1490 -->
- #1490: [backend/auth] Account lockout is never enforced — ensureAccountIsUsable() has no throw for a still-locked account

<!-- handsoff-issue-1438 -->
- #1438: [contracts] A single escrow authorized_approver conflicts with both the admin release path and the M-of-N path, blocking releases

<!-- handsoff-issue-1439 -->
- #1439: [contracts] raise_dispute builds DisputeMetadata but never stores it, so process_expired_disputes can never auto-refund
