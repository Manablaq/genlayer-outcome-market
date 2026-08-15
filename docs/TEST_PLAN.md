# Backend Test Plan

## Local Regression Tests

Run:

```sh
python3 -m unittest discover -s tests -v
python3 -m py_compile contracts/outcome_market.py
```

The unit suite covers:

- canonical resolution normalization and invalid outcome rejection;
- confidence threshold behavior;
- exact payout conservation with integer-division rounding;
- prevention of winning-stake accounting overflow; and
- cancellation/refund and resolved/unresolved state transitions using the same
  contract methods that Studio exposes; and
- the contract source boundary: strict equivalence is used for resolution, and
  the evaluator contains no storage write or transfer.

## GenVM Lint Gate

Before deployment, run GenVM lint in Studio or the GenLayer CLI. A deployable
build must have no lint finding for nested non-determinism or a storage write
inside `_evaluate_resolution_snapshot`.

## Bradbury Smoke Matrix

The deployed source must be the same commit tested locally. Run and record each
of these calls in the deployment report:

| Scenario | Expected invariant |
| --- | --- |
| Stake before close | YES/NO pool and `total_staked` grow by the sent GEN value. |
| Stake after close | Reverts; no new collateral is accepted. |
| One-sided closed market | Cancellation is allowed; each position is refunded exactly. |
| Ambiguous source | Resolution changes no storage; market remains closed. |
| Resolution after deadline | Reverts; cancellation remains available. |
| Clear source, strict consensus | Stored outcome and canonical confidence `10000` come from exact validator agreement. |
| Two winning claims with a remainder | Total paid equals `total_staked`, including rounding dust. |
| Full settlement or refunds | `accounted_balance()` returns zero. |

## Frontend Gate

The interface is permitted after the local suite and the deterministic Bradbury
refund paths pass. It must read market state from the contract, use `value`
only for `take_position`, and wait for the transaction's execution result
rather than treating consensus status alone as a state change. Before a public
claim that source resolution is production-ready, the clear-source strict
consensus scenario must also be recorded in the Bradbury report.
