# Outcome Market Corrected Release Test Report

**Report date:** 2026-08-18
**Release purpose:** Reviewer remediation for immutable/versioned evidence, freshness, and corroboration
**Corrected repository commit:** Pending release commit
**Corrected Bradbury deployment:** Pending deployment

## Release status

The corrected source and local verification are complete. A new Bradbury deployment and its finalized smoke transactions are still required before resubmission. The earlier deployment is intentionally excluded from corrected-release evidence because it predates the evidence-record model.

## Reviewer request addressed

Resolution is now bound to two independently rendered evidence records that are:

- immutable URLs pinned to full Git commit SHAs;
- stored with the market before trading;
- sourced from different repositories;
- bound to one schema, record ID, question, policy, named authority,
  authoritative source, observation time, source digest, publication, and
  expiry;
- fresh for the complete resolution window;
- prohibited from declaring an outcome; and
- independently evaluated under the registered policy to derive the same
  canonical outcome and confidence.

Any contradiction, stale record, mutable URL, metadata mismatch, fetch failure, or malformed record prevents settlement. Validators compare every consequential result field exactly. Payouts remain deterministic and pool-derived.

## Local verification

| Check | Result |
|---|---|
| Python contract compilation | PASS |
| Contract invariant suite | PASS, 17 tests |
| Frontend TypeScript and production build | PASS |
| Whitespace/error marker check | PASS |
| Production dependency audit | PASS, 0 vulnerabilities |
| GenVM lint/deployment preflight | Required before deployment |

The automated suite covers exact canonical result binding, unexpected-field
rejection, immutable URL validation, independent-repository corroboration,
authority and source-digest binding, observation freshness, exact record
headers, rejection of record-supplied outcomes and empty bodies,
contradictory/inconclusive evidence, malformed policy judgments, deterministic
payout arithmetic, exact refunds, exactly two renders plus one policy judgment,
and the absence of callback storage writes or transfers.

## Corrected Bradbury evidence

Populate this table only with finalized transactions from the corrected deployment.

| Scenario | Transaction | Final state | Status |
|---|---|---|---|
| Corrected contract deployment | Pending | Pending | NOT YET VERIFIED |
| Evidence bodies support YES; validator-derived resolution | Pending | Pending | NOT YET VERIFIED |
| YES winner claim | Pending | Pending | NOT YET VERIFIED |
| Evidence bodies support NO; validator-derived resolution | Pending | Pending | NOT YET VERIFIED |
| Contradictory evidence rejection | Pending | Market unchanged | NOT YET VERIFIED |
| Authority/source/digest metadata mismatch rejection | Pending | Market unchanged | NOT YET VERIFIED |
| Record-supplied outcome rejection | Pending | Market unchanged | NOT YET VERIFIED |
| Stale source-observation rejection | Pending | Market unchanged | NOT YET VERIFIED |
| Expired evidence rejection and cancellation | Pending | Cancelled | NOT YET VERIFIED |
| Exact refund claims | Pending | Liability `0` | NOT YET VERIFIED |
| Final `accounted_balance` | Read call pending | `0` | NOT YET VERIFIED |

## Legacy deployment disclosure

Legacy address: [`0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4`](https://explorer-bradbury.genlayer.com/address/0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4)

This deployment demonstrated the original market lifecycle, pool accounting, cancellation, refunds, source resolution, and claims. It does **not** implement the corrected immutable/versioned evidence and corroboration rules, so it must not be supplied as the contract evidence for the corrected resubmission.

## Final release declaration

Do not mark this report complete or resubmit until:

1. the corrected repository commit is recorded;
2. that exact source is deployed successfully;
3. the Explorer source matches the repository;
4. the Bradbury smoke matrix is finalized and linked;
5. the production frontend targets the corrected address; and
6. no public documentation presents the legacy address as the current release.
