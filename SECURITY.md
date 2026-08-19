# Security Policy

Outcome Market is testnet software. The actively supported release is the
contract and frontend identified in [`docs/RELEASE.md`](docs/RELEASE.md).

## Reporting a vulnerability

Open a GitHub issue containing a minimal reproduction, affected commit or
contract address, expected behavior, and observed behavior. Do not include
private keys, seed phrases, access tokens, or other secrets. For a vulnerability
that should not be public before remediation, contact the repository owner
through their GitHub profile and request a private reporting channel.

## Security boundaries

- Bradbury is a test network; do not treat testnet GEN as production funds.
- Evidence records are commit-versioned and checked for exact metadata,
  freshness, and corroboration, but publisher authority remains an auditable
  off-chain trust boundary.
- Only finalized transaction evidence is accepted in release reports.
