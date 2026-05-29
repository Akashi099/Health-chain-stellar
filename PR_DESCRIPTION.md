# [Issue #464] Delivery Proof: Tamper-Evident Hashing and On-Chain Anchoring

## Description
This PR implements a robust, tamper-evident delivery proof module. It computes a SHA-256 hash of multipart image evidence and anchors it on the Stellar blockchain via a Soroban smart contract. This provides immutable proof of existence and ensures the integrity of delivery evidence.

## Tasks
- [x] Implemented `uploadPhoto` in `DeliveryProofService` with SHA-256 hashing.
- [x] Added `POST /delivery-proof/:orderId/upload` multipart endpoint with 5MB validation.
- [x] Integrated `SorobanService.anchorHash` to immutably record hashes on-chain.
- [x] Persisted hashes and storage URLs in `DeliveryProofEntity`.
- [x] Added `blockchainTxHash` to link local records with on-chain proofs.

## Acceptance Criteria
- [x] SHA-256 hash uniquely identifies the uploaded image.
- [x] Hash anchored on-chain for every successful upload.
- [x] Large files (>5MB) rejected with 413 Payload Too Large.
- [x] Modified versions of the same image produce different hashes.

## Branch
`feature/issue-464-delivery-proof`

## Closes
Closes #464
