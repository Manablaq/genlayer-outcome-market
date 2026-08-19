# Bradbury Release Record

This document is the reproducible identity record for the corrected
evidence-bound Outcome Market deployment.

## Contract identity

| Field | Value |
| --- | --- |
| Network | GenLayer Bradbury, chain ID `4221` |
| Contract | [`0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF`](https://explorer-bradbury.genlayer.com/address/0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF) |
| Deployment transaction | [`0x2091634bde3647f37c3baaa4ce5fddd2034a91ee0803c535ba8f19cda4e700ef`](https://explorer-bradbury.genlayer.com/tx/0x2091634bde3647f37c3baaa4ce5fddd2034a91ee0803c535ba8f19cda4e700ef) |
| Transaction state | `FINALIZED` |
| Consensus result | `AGREE` |
| Execution result | `FINISHED_WITH_RETURN` |
| Deployed source commit | [`74756aaecbb2f2055d58b7dd1d096ec57612e8a1`](https://github.com/Manablaq/genlayer-outcome-market/commit/74756aaecbb2f2055d58b7dd1d096ec57612e8a1) |
| Contract source SHA-256 | `8a8bc9cdb672795f37042d570dd422e70eac78ca8a55ffe5d9d8ca7476b806cd` |

## Reproduce the source check

From the repository root, run:

```sh
node scripts/verify-deployment.mjs
```

The verifier retrieves the Bradbury deployment receipt, requires finalized
agreement and successful execution, extracts the Python source from deployment
calldata, compares it byte-for-byte with `contracts/outcome_market.py`, and
checks the recorded SHA-256 digest. It performs no write operation.

## Qualification status

Deployment identity and source equivalence are verified. Finalized lifecycle
transactions and negative evidence cases are recorded separately in
[`TEST_REPORT.md`](TEST_REPORT.md); that report is authoritative for resubmission
readiness.

## Historical deployment

`0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4` predates the versioned evidence
model. It remains documented for audit history but is not part of this release.
