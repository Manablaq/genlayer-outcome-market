# Outcome Market Protocol Specification

## Purpose

Outcome Market is a collateralized binary prediction-market primitive for
GenLayer. A market has a YES and a NO side. Participants escrow GEN by taking
one of those positions. Once the market closes, a source-backed resolution
determines the winning side. Winners claim the entire escrowed pool pro rata.

This is deliberately a parimutuel market rather than an AMM. The contract does
not manufacture liquidity, borrow funds, or expose participants to an
algorithmic pricing curve. Every successful claim is covered by value already
held by the contract.

## Lifecycle

1. **Open**: The creator registers a precise question, a close timestamp, a
   resolution deadline, a public resolution source URL, and an immutable
   resolution policy.
2. **Trading**: Any address may escrow GEN on YES or NO before `close_ts`.
   A participant may add to an existing position, but cannot withdraw it while
   the market is open.
3. **Closed**: Trading is permanently disabled after `close_ts`.
4. **Resolved**: A strict-equivalence source review sets one winner. Winning
   positions can claim from the full pool. Resolution is permitted only before
   the registered resolution deadline.
5. **Cancelled**: If a source cannot resolve the question by
   `resolution_deadline_ts`, anyone may cancel the market. Each participant can
   then claim their exact stake back.
6. **Settled**: The market reaches zero liability once all owed value has been
   claimed.

## Resolution Contract

The following data is fixed at market creation and is included in every
validator's resolution snapshot:

- question
- source URL
- resolution policy
- close timestamp
- supported outcomes (`yes`, `no`)

`resolve_market` constructs that deterministic snapshot before entering the
non-deterministic call. Its evaluator may fetch the public source and ask the
model to classify it under the registered policy. It returns only canonical
JSON with these settlement-relevant fields:

```json
{"confidence_bps":10000,"outcome":"yes","state":"resolved"}
```

The evaluator does **not** write storage, emit transfers, or call another
non-deterministic operation. `gl.eq_principle.strict_eq` independently executes
that evaluator for every validator and requires the canonical result to match
exactly. Raw model confidence is only a threshold input: a score from 8,000 to
10,000 becomes the canonical value `10000`; all other results become canonical
`unresolved` with `0`. Consequently, outcome and confidence are both bound
before any market state is written, without a tolerance that could change a
settlement result. An `unresolved` result is rejected without changing market
state, leaving the market closed for a later retry or cancellation.

## Settlement

For a resolved market:

```text
winning_pool = YES pool if outcome == yes, otherwise NO pool
claim_i = floor(stake_i * total_pool / winning_pool)
```

The final winning claimant receives `total_pool - paid_out`, rather than the
rounded formula, so rounding dust is assigned deterministically and the total
of all claims equals the exact escrowed pool. The contract stores cumulative
`paid_out` and `refunded` values for every market. Its accounted liability is:

```text
sum(total_staked - paid_out - refunded)
```

For a cancelled market, each position is refunded its exact stake. A position
can be claimed only once in either path.

## Scope And Non-Goals

- GEN collateral only in the first release.
- Binary (`yes`/`no`) outcomes only.
- One immutable public source URL and one immutable policy per market.
- No market-creator fee, protocol fee, or privileged outcome override.
- This is testnet software, not financial advice or a production deployment.
