# Outcome Market

Outcome Market is a source-resolved, collateralized binary prediction-market
application for GenLayer. Participants escrow GEN on immutable YES/NO markets;
the contract later uses independently verified public-source resolution to
select a winner, then calculates every claim from locked pools.

The backend was built and tested first. The project now includes a browser
interface in [`frontend`](frontend) that reads the Bradbury deployment and uses
the documented `genlayer-js` provider-backed wallet flow for writes. Bradbury
testing includes both deterministic cancellation/refund paths and a completed
two-sided, public-source resolution followed by a winning claim.

## Live Release

- Application: [genlayer-outcome-market.vercel.app](https://genlayer-outcome-market.vercel.app/)
- Bradbury contract: [`0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4`](https://explorer-bradbury.genlayer.com/address/0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4)
- Deployment evidence and lifecycle results: [Bradbury test report](docs/TEST_REPORT.md)

## Backend Design

- Parimutuel settlement: every claim is covered by collateral already held by
  the contract.
- Exact payout conservation: final winner receives any integer-division dust.
- Source-backed outcome resolution: validators independently re-fetch and
  reapply the market's immutable resolution policy.
- Exact consensus binding: `state`, `outcome`, and `confidence_bps` use
  canonical JSON under `strict_eq`; qualifying confidence is normalized to
  `10000` and never changes a payout.
- Failure recovery: one-sided or overdue unresolved markets cancel into exact
  participant refunds.

## Documentation

- [Market protocol](docs/MARKET_SPEC.md)
- [Security model](docs/SECURITY_MODEL.md)
- [Backend API](docs/BACKEND_API.md)
- [Test plan](docs/TEST_PLAN.md)
- [Deployment gate](docs/DEPLOYMENT_GATE.md)
- [Bradbury test report](docs/TEST_REPORT.md)
- [Frontend developer guide](frontend/README.md)
