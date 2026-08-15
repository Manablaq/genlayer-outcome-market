# Security Model

## Core Invariants

1. A market cannot accept stakes after its close timestamp.
2. `total_staked` equals the sum of all recorded positions for that market.
3. A position is paid or refunded at most once.
4. `paid_out + refunded` never exceeds `total_staked`.
5. `accounted_balance()` equals all market liabilities still owed to users.
6. Resolution state is written only after validator consensus returns an exact,
   canonical decision and confidence value.
7. No participant, creator, or resolver has an administrative method to choose
   an outcome or move user collateral.

## Validator Safety

The contract avoids a shape-only validator. Every validator independently:

1. receives the same immutable resolution snapshot;
2. fetches and evaluates the registered public source under the registered
   policy; and
3. compares the complete canonical output through `strict_eq`.

The canonical output contains `state`, `outcome`, and `confidence_bps`.
`confidence_bps` is not a raw model score or a payout input: every qualifying
source review is normalized to exactly `10000`, while every insufficient review
is normalized to `0` and `unresolved`. There is no permitted tolerance in the
stored payload. A changed outcome or resolved/unresolved state fails equivalence
instead of permitting a downstream settlement discrepancy.

## Non-Determinism Boundary

The evaluator used by `strict_eq` performs only source retrieval, model review,
normalization, and canonical serialization. It never mutates storage and never
emits an external transfer. `resolve_market` parses and validates the agreed
output after `strict_eq` returns; only then does it write the outcome and
confidence to contract storage.

## Resolution Failure

If the source does not conclusively establish a YES or NO outcome, resolution
does not change state. After the registered resolution deadline, any caller can
cancel the market. This makes an unavailable or ambiguous source a refund path,
not a loss of collateral or a privileged judgment call.

## Transfer Safety

Transfers are calculated from deterministic storage. Each transfer uses
`emit_transfer` only after all state counters and the position claim flag have
been updated. The contract exposes both chain balance and accounted liability;
test flows must verify that liability returns to zero after every complete
resolved or cancelled market.
