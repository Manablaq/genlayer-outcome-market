# Outcome Market Corrected Release Test Report

**Report date:** 2026-08-19
**Release purpose:** Reviewer remediation for immutable/versioned evidence, freshness, and corroboration
**Deployed contract source commit:** [`74756aaecbb2f2055d58b7dd1d096ec57612e8a1`](https://github.com/Manablaq/genlayer-outcome-market/commit/74756aaecbb2f2055d58b7dd1d096ec57612e8a1)
**Corrected Bradbury deployment:** [`0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF`](https://explorer-bradbury.genlayer.com/address/0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF)

## Release status

The corrected source is deployed and finalized on Bradbury. Deployment calldata
matches the repository contract byte-for-byte. Finalized lifecycle smoke
transactions and negative evidence cases are still required before
resubmission. The legacy deployment remains excluded because it predates the
evidence-record model.

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
| Full dependency audit | PASS, 0 vulnerabilities |
| Deployment receipt and source reproduction | PASS |
| Commit-pinned positive evidence fixtures | PASS; verified against authoritative source bytes |
| GenLayer CLI preflight | CLI `0.39.2` exposes no standalone lint command; deployed source compilation and five-validator finalized execution passed |

The automated suite covers exact canonical result binding, unexpected-field
rejection, immutable URL validation, repository-separated corroboration,
authority and source-digest binding, observation freshness, exact record
headers, rejection of record-supplied outcomes and empty bodies,
contradictory/inconclusive evidence, malformed policy judgments, deterministic
payout arithmetic, exact refunds, exactly two renders plus one policy judgment,
and the absence of callback storage writes or transfers.

The live fixture URLs, exact commit references, recorded source digest, and
negative test inputs are in [`SMOKE_FIXTURES.md`](SMOKE_FIXTURES.md). The
fixtures prove contract behavior, not independent publisher ownership; that
limitation is disclosed in the evidence specification and security model.

## Corrected Bradbury evidence

Populate this table only with finalized transactions from the corrected deployment.

| Scenario | Transaction | Final state | Status |
|---|---|---|---|
| Corrected contract deployment | [`0x209163…e700ef`](https://explorer-bradbury.genlayer.com/tx/0x2091634bde3647f37c3baaa4ce5fddd2034a91ee0803c535ba8f19cda4e700ef) | `FINALIZED`, `AGREE`, `FINISHED_WITH_RETURN`; 5/5 revealed votes agree | PASS |
| Evidence bodies support YES; validator-derived resolution | Pending | Pending | NOT YET VERIFIED |
| YES winner claim | Pending | Pending | NOT YET VERIFIED |
| Evidence bodies support NO; validator-derived resolution | Pending | Pending | NOT YET VERIFIED |
| Contradictory evidence rejection | Pending | Market unchanged | NOT YET VERIFIED |
| Authority/source/digest metadata mismatch rejection | Pending | Market unchanged | NOT YET VERIFIED |
| Record-supplied outcome rejection | Pending | Market unchanged | NOT YET VERIFIED |
| Stale source-observation rejection | Pending | Market unchanged | NOT YET VERIFIED |
| Expired evidence rejection and cancellation | Pending | Cancelled | NOT YET VERIFIED |
| Exact refund claims | Pending | Liability `0` | NOT YET VERIFIED |
| Initial deployment `accounted_balance` | Read call | `0` with `get_market_count = 0` before smoke execution | PASS (baseline only) |
| Final post-smoke `accounted_balance` | Read call pending | `0` | NOT YET VERIFIED |

## Legacy deployment disclosure

Legacy address: [`0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4`](https://explorer-bradbury.genlayer.com/address/0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4)

This deployment demonstrated the original market lifecycle, pool accounting, cancellation, refunds, source resolution, and claims. It does **not** implement the corrected immutable/versioned evidence and corroboration rules, so it must not be supplied as the contract evidence for the corrected resubmission.

## Final release declaration

Do not mark this report complete or resubmit until:

1. the Bradbury smoke matrix is finalized and linked;
2. the production frontend targets the corrected address;
3. all resolved and cancelled flows reconcile to zero liability; and
4. no public documentation presents the legacy address as the current release.
