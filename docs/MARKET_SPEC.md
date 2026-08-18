# Outcome Market Protocol Specification

## Purpose

Outcome Market is a collateralized YES/NO prediction-market primitive for
GenLayer. Participants escrow GEN, corroborating immutable evidence determines
the winner, and winning claims share the complete locked pool pro rata.

This is a parimutuel market, not an AMM. It does not manufacture liquidity,
borrow collateral, or accept an AI-selected payout.

## Lifecycle

1. **Register**: The creator fixes the question, policy, named authority,
   authoritative source, observation time, source digest, canonical evidence
   record ID, two commit-pinned records from different repositories, evidence
   validity window, trading close, and resolution deadline.
2. **Trade**: Addresses escrow GEN on YES or NO before `close_ts`.
3. **Close**: Trading ends permanently.
4. **Verify**: Validators independently fetch both records, bind every
   provenance field, and apply the registered policy to both untrusted bodies.
5. **Resolve**: Exact consensus stores YES or NO with canonical confidence
   `10000`.
6. **Cancel**: One-sided, expired-evidence, or overdue unresolved markets enable
   exact refunds.
7. **Settle**: Liability reaches zero after all claims or refunds.

## Immutable Resolution Snapshot

The complete snapshot includes:

- question and policy;
- evidence schema and record ID;
- authority, authoritative source URL, source observation, and source digest;
- both pinned evidence URLs and commit references;
- publication and expiry timestamps.

The evaluator uses one `strict_eq` callback with exactly two independent
renders and one policy judgment. Each record must match the snapshot and may
not provide an outcome. Validators derive the outcome and confidence from the
two evidence bodies under the registered policy. The canonical returned
payload contains every consequential provenance and decision value, and
`strict_eq` requires exact agreement. The callback never writes storage or
emits a transfer.

## Settlement

For a resolved market:

```text
winning_pool = YES pool if outcome == yes, otherwise NO pool
claim_i = floor(stake_i * total_pool / winning_pool)
```

The final winning claimant receives `total_pool - paid_out`, assigning integer
division dust deterministically. For cancellation, every position receives its
exact original stake. A position can be claimed only once.

The accounted liability is:

```text
sum(total_staked - paid_out - refunded)
```

## Scope

- GEN collateral.
- Binary YES/NO outcomes.
- Two versioned evidence records per market.
- Maximum 24-hour source-observation-to-publication age.
- Maximum 31-day evidence validity window.
- No creator fee, protocol fee, or privileged outcome override.
- Testnet software, not a production financial service.
