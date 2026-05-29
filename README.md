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

### Local Development Setup

For contributors, we provide a Docker Compose stack for easy local development:

```bash
# Start Postgres + Redis
docker-compose up -d

# Setup backend
cd backend
npm install
npm run start:dev
```

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed instructions and optional development tools.

## Project Structure

| Directory | README |
|-----------|--------|
| `backend/` | [Backend README](./backend/README.md) |
| `contracts/` | [Contracts README](./contracts/README.md) |
| `lifebank-soroban/` | [Lifebank Soroban README](./lifebank-soroban/README.md) |
