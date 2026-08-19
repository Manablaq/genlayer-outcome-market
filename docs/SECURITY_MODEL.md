# Security Model

## Core Invariants

1. Stakes are rejected after the close timestamp.
2. Total stake equals recorded YES and NO positions.
3. A position is paid or refunded at most once.
4. Paid plus refunded value never exceeds total stake.
5. Accounted balance equals outstanding participant liability.
6. A winner is stored only from fresh, corroborated, versioned evidence under
   exact validator consensus.
7. No creator, resolver, or validator supplies a payout amount.

## Evidence Threat Model

| Threat | Enforced response |
| --- | --- |
| Authoritative page changes after capture | The observed source URL, timestamp, creator-declared digest, and both commit-pinned records are immutable market fields. The original page remains an explicit audit boundary. |
| Stale but internally consistent record | Observation must precede publication by no more than 24 hours; publication and expiry are checked at creation and resolution. |
| One altered repository | A second commit-pinned record from a different repository must agree exactly. Repository separation is not asserted to prove separate ownership. |
| Contradictory corroboration | No winner is stored. |
| Metadata swapped around valid content | Record ID, question, policy, authority, source URL, source digest, and all timestamps must match the market snapshot. |
| Evidence record declares a winner | An `Outcome` header is rejected; validators derive the result from the body and policy. |
| Validator returns a different result | Complete canonical payload fails `strict_eq`. |
| Evidence becomes unavailable | Resolution cannot write state; cancellation/refunds remain available. |

## Authority Boundary

Authority is a creator-registered claim made auditable by the named authority,
authoritative source URL, observation timestamp, source digest, and both pinned
records. The contract enforces exact binding, immutable versioning,
repository-separated corroboration, and freshness. It does not fetch the original source,
recompute its digest, or claim that a GitHub username is inherently
authoritative. Different repositories may be controlled by the same publisher.
Reviewers should verify the retained source bytes, capture process, commit
history, and repository maintainers before treating a market as trustworthy.

## Non-Determinism Boundary

`_evaluate_resolution_snapshot` uses one `strict_eq` callback containing two
web renders and one policy judgment. The callback independently parses and
checks both records, evaluates their untrusted bodies, and returns every
consequential provenance and decision field. It contains no storage mutation,
transfer, nested non-determinism, or selected payout. `resolve_market`
validates the exact agreed payload before writing outcome and confidence.

## Failure And Recovery

Malformed, contradictory, unavailable, or stale records do not modify outcome
state. Once evidence expires or the resolution deadline passes, cancellation
returns each unclaimed stake exactly. This converts evidence failure into a
refund path rather than discretionary settlement.

## Legacy Deployment

`0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4` predates this evidence model.
It must not be represented as the corrected deployment or used in a corrected
submission.
