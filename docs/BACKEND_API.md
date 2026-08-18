# Backend API

All GEN amounts are integer wei values. Payable calls send collateral through
the transaction `value`.

## Writes

### `create_market(...)`

```text
create_market(
  question,
  resolution_policy,
  authority_name,
  authoritative_source_url,
  source_observed_at,
  source_digest,
  evidence_record_id,
  primary_evidence_url,
  corroboration_evidence_url,
  evidence_published_at,
  evidence_expires_at,
  close_ts,
  resolution_deadline_ts,
)
```

Creates an immutable YES/NO market and returns its numeric ID.

- `question`: single-line proposition.
- `resolution_policy`: single-line evidence decision rule.
- `authority_name`: named institution or publisher responsible for the source.
- `authoritative_source_url`: registered HTTPS origin of the observed evidence.
- `source_observed_at`: Unix timestamp when the source snapshot was captured.
- `source_digest`: 64-character lowercase digest of the observed source bytes,
  calculated off chain and bound across both immutable records.
- `evidence_record_id`: canonical identifier shared by both evidence records.
- `primary_evidence_url`: raw GitHub URL pinned to a 40-character commit SHA.
- `corroboration_evidence_url`: independently maintained, commit-pinned raw
  GitHub URL from a different repository.
- `evidence_published_at`: Unix timestamp when the evidence became valid.
- `evidence_expires_at`: Unix timestamp after which resolution is forbidden.
- `close_ts`: Unix timestamp when trading ends.
- `resolution_deadline_ts`: final Unix timestamp for a resolution attempt.

Creation rejects mutable branch URLs, two records from the same repository,
invalid provenance or digest fields, source observation after publication,
publication more than 24 hours after observation, future-dated evidence, stale
evidence, a validity window longer than 31 days, or evidence that expires
before the resolution deadline.

### `take_position(market_id, outcome)` payable

Escrows the transaction value on `yes` or `no`. Positions can be increased
until `close_ts`.

### `close_market(market_id)`

Moves an open market to `closed` after `close_ts`. Resolution and cancellation
also close an overdue open market before applying their own checks.

### `resolve_market(market_id)`

Requires a closed, two-sided market before both the evidence expiry and the
resolution deadline. Validators independently render both immutable evidence
records, parse their canonical headers, and require exact agreement on:

- evidence schema and record ID;
- question, policy, authority, and authoritative source;
- source observation, source digest, publication, and expiry;
- each independent policy evaluation; and
- one validator-derived outcome and canonical confidence (`10000`).

Contradictory, malformed, unavailable, stale, or mismatched records cannot
write a winner. The non-deterministic evaluator performs no storage writes and
no transfers. Records cannot supply an outcome or confidence field.

### `cancel_market(market_id)`

Cancels a market if it is one-sided, its evidence has expired, or its
resolution deadline has passed. Cancellation enables exact stake refunds and
never selects a winner.

### `claim(market_id, outcome)`

Claims one caller-owned position. Cancelled markets refund exact stake;
resolved markets pay only the winning outcome. State is updated before the
transfer is emitted.

## Reads

### `get_market_count()`

Returns the number of markets.

### `get_market(market_id)`

Returns market configuration and lifecycle data, including:

- `evidence_record_id`;
- authority, authoritative source, source observation, and source digest;
- both immutable evidence URLs and parsed commit references;
- publication and expiry timestamps;
- `evidence_is_fresh`;
- pools, outcome, confidence, payouts, refunds, and remaining liability; and
- `can_cancel`.

### `get_position(market_id, owner, outcome)`

Returns one address's YES or NO position and claim state.

### `get_market_position_count(market_id)`

Returns the number of unique owner/outcome positions in a market.

### `contract_balance()` and `accounted_balance()`

`contract_balance` is the chain value held by the contract.
`accounted_balance` is collateral still owed to users. Fully settled or fully
refunded flows must return the relevant liability to zero.

## Statuses

| Status | Meaning |
| --- | --- |
| `open` | Trading is available before `close_ts`. |
| `closed` | Trading ended; resolution or cancellation may proceed. |
| `resolved` | Validators derived YES or NO from corroborating evidence under exact consensus. |
| `cancelled` | Participants may recover their original stakes. |
