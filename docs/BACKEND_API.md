# Backend API

All GEN amounts are integer wei values. A payable call sends collateral through
the transaction `value`; do not pass a decimal string to the method arguments.

## Writes

### `create_market(question, source_url, resolution_policy, close_ts, resolution_deadline_ts)`

Creates an immutable YES/NO market and returns its numeric ID.

- `question`: the proposition participants are predicting.
- `source_url`: one HTTPS public source used by every validator.
- `resolution_policy`: the exact rule used to interpret that source.
- `close_ts`: Unix timestamp when new positions become unavailable.
- `resolution_deadline_ts`: Unix timestamp after which resolution is blocked
  and the cancellation refund path is available.

### `take_position(market_id, outcome)` payable

Escrows the transaction value on `yes` or `no`. A user can add to an existing
position, including a position on each side, until the market closes.

### `close_market(market_id)`

Moves an open market to `closed` after its close timestamp. This is optional for
resolvers: `resolve_market` and `cancel_market` close an overdue open market
themselves.

### `resolve_market(market_id)`

Fetches the registered source and applies the stored policy. This requires the
market to be closed, liquid on both sides, and before its resolution deadline.

Every validator independently executes the evaluator through `strict_eq`. The
only agreed payload is canonical JSON containing `state`, `outcome`, and
`confidence_bps`. Raw confidence is thresholded and canonicalized to `10000`
for a resolved result or `0` for an unresolved result; it never controls a
payout. A non-final source response causes the transaction to fail without
modifying market state.

### `cancel_market(market_id)`

Cancels a closed market when either side has no collateral or the resolution
deadline has passed. Cancellation never selects a winner; it enables exact
stake refunds.

### `claim(market_id, outcome)`

Claims a caller's single `yes` or `no` position. For cancelled markets it
refunds exact stake. For resolved markets only the winning outcome is
claimable. A position is marked claimed before its transfer is emitted.

## Reads

### `get_market_count()`

Returns the number of markets.

### `get_market(market_id)`

Returns configuration, lifecycle state, pools, outcome/confidence, aggregate
paid/refunded values, remaining liability, and `can_cancel`.

### `get_position(market_id, owner, outcome)`

Returns a caller-independent view of one address's `yes` or `no` position. A
missing position returns `found: false`; an unknown market reverts.

### `get_market_position_count(market_id)`

Returns the number of unique owner/outcome positions in a market.

### `contract_balance()` and `accounted_balance()`

`contract_balance` is the chain value held by the contract. `accounted_balance`
is the total collateral still owed to participants. After every fully settled
or fully refunded market, accounted liability must be zero for that market.

## Statuses

| Status | Meaning |
| --- | --- |
| `open` | Positions may be taken before `close_ts`. |
| `closed` | No more positions; eligible for source resolution or cancellation. |
| `resolved` | Exact validator consensus selected `yes` or `no`. |
| `cancelled` | Users may claim their original stakes back. |
