#!/bin/bash

set -e

# Configuration
NETWORK="testnet"
IDENTITY="default"  # Your Stellar CLI identity

echo "🚀 Deploying Lifebank contracts to ${NETWORK}..."
echo ""

# Check if soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo "❌ Error: soroban CLI not found. Please install it first."
    echo "   cargo install --locked soroban-cli"
    exit 1
fi

# Build all contracts first
echo "📦 Building contracts..."
./scripts/build-all.sh

echo ""
echo "🌐 Deploying to ${NETWORK}..."
echo ""

# Deploy each contract
declare -A CONTRACT_IDS

for contract in inventory requests payments identity; do
    echo "Deploying ${contract} contract..."
    
    CONTRACT_ID=$(soroban contract deploy \
        --wasm target/wasm32-unknown-unknown/release/${contract}_contract.wasm \
        --source ${IDENTITY} \
        --network ${NETWORK})
    
    CONTRACT_IDS[$contract]=$CONTRACT_ID
    
    echo "  ✅ ${contract}: ${CONTRACT_ID}"
    echo ""
done

# Save contract IDs to a file
echo "💾 Saving contract IDs to .contract-ids.json..."

cat > .contract-ids.json << EOF
{
  "network": "${NETWORK}",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "inventory": "${CONTRACT_IDS[inventory]}",
    "requests": "${CONTRACT_IDS[requests]}",
    "payments": "${CONTRACT_IDS[payments]}",
    "identity": "${CONTRACT_IDS[identity]}"
  }
}
EOF

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Contract IDs saved to .contract-ids.json"

# ── Regenerate TypeScript bindings (issue #846) ────────────────────────────────
echo ""
echo "🔗 Regenerating TypeScript client bindings..."

# Export contract IDs so generate-bindings.sh can pick them up
export COORDINATOR_CONTRACT_ID="${CONTRACT_IDS[coordinator]:-}"
export INVENTORY_CONTRACT_ID="${CONTRACT_IDS[inventory]}"
export PAYMENTS_CONTRACT_ID="${CONTRACT_IDS[payments]}"
export REQUESTS_CONTRACT_ID="${CONTRACT_IDS[requests]}"
export TEMPERATURE_CONTRACT_ID="${CONTRACT_IDS[temperature]:-}"
export SOROBAN_NETWORK="${NETWORK}"

GENERATE_SCRIPT="$(cd "$(dirname "$0")/../.." && pwd)/scripts/generate-bindings.sh"

if [[ -f "${GENERATE_SCRIPT}" ]]; then
  bash "${GENERATE_SCRIPT}"
else
  echo "  ⚠️  generate-bindings.sh not found at ${GENERATE_SCRIPT} — skipping."
  echo "  Run scripts/generate-bindings.sh manually to regenerate TypeScript bindings."
fi