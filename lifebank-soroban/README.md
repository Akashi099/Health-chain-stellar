# Lifebank Soroban Contracts

This workspace contains the Lifebank Soroban smart contracts used by Health-chain.

## Project structure

The repository uses a Cargo workspace with contract crates located under `contracts/*`.

Existing contract directories include:

- `analytics`
- `coordinator`
- `delivery`
- `identity`
- `inventory`
- `matching`
- `payments`
- `reputation`
- `requests`
- `temperature`

Each contract directory contains its own `Cargo.toml` and source files, while the top-level `Cargo.toml` provides shared workspace dependency definitions.

## Running tests

From the repository root:

```bash
cargo test
```

## Contract development

- Add new contracts under `contracts/<contract-name>`.
- Each contract must include its own `Cargo.toml`.
- Shared dependencies are declared in the top-level workspace `Cargo.toml`.

## Environment

This workspace does not require any `.env` variables by default. If your local Soroban toolchain or contract scripts need environment variables, add them to a `.env` file and keep it out of source control.

## Notes

This repository no longer uses the starter `hello_world` template. Use the contracts already present under `contracts/`.
