# Outcome Market

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
- Corrected Bradbury deployment: pending deployment and smoke verification
- Legacy deployment: [`0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4`](https://explorer-bradbury.genlayer.com/address/0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4)

The legacy deployment proves the escrow, cancellation, resolution, and claim
lifecycle, but it is not the corrected evidence-bound release and must not be
used as Explorer evidence for resubmission. Until a new address is configured,
the frontend remains a read-only legacy viewer and blocks corrected-protocol
writes.

## Security Properties

- Versioned evidence: each evidence URL is a GitHub raw URL pinned to a
  lowercase 40-character commit SHA.
- Independent corroboration: the primary and corroborating records must be in
  different repositories and must agree exactly.
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
- [Test plan](docs/TEST_PLAN.md)
- [Deployment gate](docs/DEPLOYMENT_GATE.md)
- [Bradbury test report](docs/TEST_REPORT.md)
- [Frontend developer guide](frontend/README.md)

## Local Verification

```sh
PYTHONPYCACHEPREFIX=/private/tmp/outcome-market-pycache \
  python3 -m unittest discover -s tests -p 'test_outcome_market_invariants.py' -v
PYTHONPYCACHEPREFIX=/private/tmp/outcome-market-pycache \
  python3 -m py_compile contracts/outcome_market.py tests/test_outcome_market_invariants.py
cd frontend && npm run build
```

This is testnet software and is not financial advice.
