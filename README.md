# Outcome Market

[![CI](https://github.com/Manablaq/genlayer-outcome-market/actions/workflows/ci.yml/badge.svg)](https://github.com/Manablaq/genlayer-outcome-market/actions/workflows/ci.yml)
[![Network](https://img.shields.io/badge/GenLayer-Bradbury-7257e8)](https://explorer-bradbury.genlayer.com/address/0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF)

Outcome Market is a collateralized binary prediction-market application for
GenLayer. Participants escrow GEN on YES or NO, validators resolve a market
from registered evidence, and the contract derives every claim from the locked
pools.

The corrected protocol does not resolve against a mutable web page. Every
market registers two corroborating evidence records that are pinned to exact
Git commit SHAs, come from different repositories, identify the same named
authority and authoritative source snapshot, carry the same source digest and
canonical record metadata, and remain inside an explicit validity window.
Validators independently fetch both records, apply the registered policy to
their untrusted bodies, and strict equivalence binds the provenance, derived
decision, and confidence that can affect settlement.

## Release Status

- Application: [genlayer-outcome-market.vercel.app](https://genlayer-outcome-market.vercel.app/)
- Repository: [Manablaq/genlayer-outcome-market](https://github.com/Manablaq/genlayer-outcome-market)
- Corrected Bradbury deployment: [`0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF`](https://explorer-bradbury.genlayer.com/address/0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF)
- Deployment transaction: [`0x209163…e700ef`](https://explorer-bradbury.genlayer.com/tx/0x2091634bde3647f37c3baaa4ce5fddd2034a91ee0803c535ba8f19cda4e700ef), finalized with validator agreement
- Contract source: commit [`74756aa`](https://github.com/Manablaq/genlayer-outcome-market/commit/74756aaecbb2f2055d58b7dd1d096ec57612e8a1), SHA-256 `8a8bc9cdb672795f37042d570dd422e70eac78ca8a55ffe5d9d8ca7476b806cd`
- Legacy deployment: [`0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4`](https://explorer-bradbury.genlayer.com/address/0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4)

The corrected deployment is finalized and its source has been reproduced from
deployment calldata byte-for-byte. Bradbury lifecycle qualification is tracked
in [the release test report](docs/TEST_REPORT.md). The legacy deployment is
retained only for historical transparency and must not be used as evidence for
the corrected release.

## Security Properties

- Versioned evidence: each evidence URL is a GitHub raw URL pinned to a
  lowercase 40-character commit SHA.
- Repository-separated corroboration: the primary and corroborating records
  must be pinned in different repositories and must agree exactly. Repository
  separation does not by itself prove independent ownership; publisher trust is
  an explicit audit boundary.
- Freshness: publication and expiry timestamps are registered at creation;
  the source observation cannot be later than publication or more than 24
  hours old at publication, and evidence cannot be future-dated, expired,
  valid for more than 31 days, or expire before the resolution deadline.
- Exact consensus binding: authority, authoritative source, source observation,
  source digest, record ID, question, policy, timestamps, validator-derived
  outcome, and confidence are checked under `strict_eq`.
- Deterministic settlement: validators never select a payout amount. Claims
  and refunds are calculated from stored positions and pools.
- Defined recovery: expired, one-sided, or overdue unresolved markets enter an
  exact refund path.

## Documentation

- [Evidence record specification](docs/EVIDENCE_RECORD_SPEC.md)
- [Market protocol](docs/MARKET_SPEC.md)
- [Security model](docs/SECURITY_MODEL.md)
- [Backend API](docs/BACKEND_API.md)
- [Historical Bradbury qualification plan](docs/archive/BRADBURY_QUALIFICATION_PLAN.md)
- [Deployment gate](docs/DEPLOYMENT_GATE.md)
- [Bradbury test report](docs/TEST_REPORT.md)
- [Release record](docs/RELEASE.md)
- [Bradbury smoke fixtures](docs/SMOKE_FIXTURES.md)
- [Frontend developer guide](frontend/README.md)

## Local Verification

```sh
PYTHONPYCACHEPREFIX=/private/tmp/outcome-market-pycache \
  python3 -m unittest discover -s tests -p 'test_outcome_market_invariants.py' -v
PYTHONPYCACHEPREFIX=/private/tmp/outcome-market-pycache \
  python3 -m py_compile contracts/outcome_market.py tests/test_outcome_market_invariants.py
cd frontend && npm run build
npm audit
cd .. && node scripts/verify-deployment.mjs
node scripts/verify-evidence-fixtures.mjs
```

This is testnet software and is not financial advice.
