# Outcome Market — Bradbury Release Evidence

**Report date:** 2026-08-20
**Release purpose:** Reviewer remediation for authoritative, immutable/versioned evidence with explicit freshness and corroboration rules
**Corrected Bradbury deployment:** `0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF`
**Deployed remediation source commit:** `74756aaecbb2f2055d58b7dd1d096ec57612e8a1`

## Release summary

The corrected Outcome Market deployment binds resolution to immutable, commit-pinned evidence records and applies explicit provenance, freshness, corroboration, and canonical-settlement requirements.

Live Bradbury verification demonstrated the reviewer-critical remediation properties:

- mutable evidence URLs are rejected;
- corroborating evidence must come from a distinct repository;
- stale source observations are rejected;
- settlement metadata is bound to the configured market;
- contradictory evidence fails closed;
- provenance and source-digest mismatches fail closed;
- malformed evidence fails closed;
- a valid evidence-bound YES market finalized successfully;
- the winning position received the full pool-derived payout;
- cancellation and refunds conserved collateral;
- final `accounted_balance` and `contract_balance` both returned `0`.

## Deployment provenance

Corrected contract:

`0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF`

Deployment transaction:

`0x2091634bde3647f37c3baaa4ce5fddd2034a91ee0803c535ba8f19cda4e700ef`

The deployed remediation source is associated with commit:

`74756aaecbb2f2055d58b7dd1d096ec57612e8a1`

## Immutable evidence enforcement

### Mutable evidence rejection

Transaction:

`0x4f5b4c7b7a519c4c6d75b84cb4a1d5aa187d61e7cac46394a993cd915f5b0864`

A deliberately mutable GitHub branch URL was rejected with `FINISHED_WITH_ERROR`. No market was created.

### Distinct corroboration repository enforcement

Transaction:

`0x6b3bca5b8a619c91f088cb77d3306d11f1b3d4f5ef419893176e7f1aa31f7fcd`

Primary and corroborating evidence were deliberately pointed to the same repository. Creation was rejected and no market state was created.

### Freshness enforcement

Transaction:

`0xbc227a6bb6637db55bdcf74fc521762c4bff6cb964feefdec294e80d605bda10`

A source observation outside the permitted freshness bound was rejected.

## Successful evidence-bound settlement

A clean market was created using two distinct commit-pinned evidence repositories together with a versioned GenLayer Labs source.

Creation transaction:

`0xa0258ba1ac50c88ff18015803dc856cb54f4e716dc29058562a7a5a3f6fa1cd6`

Before resolution, Finalized state showed:

- YES pool: `1000000000000000000`
- NO pool: `1000000000000000000`
- total staked: `2000000000000000000`
- evidence fresh: `true`

Resolution transaction:

`0xc2307093ef90191abd49d62a7697babcb70ff2ec51725c820ce52269b0c59592`

Finalized market state:

- status: `resolved`
- outcome: `yes`
- confidence: `10000`

The settlement remained bound to the expected authority, source URL, source digest, evidence record ID, primary evidence reference, corroborating evidence reference, and evidence timestamps.

## Winner payout

Claim transaction:

`0x31bb239de7ff0166b7005d2ab6f4cf97c838f574cbe5cfd1c99c6011f8254ea0`

The Bradbury explorer showed an outbound internal message of:

`2.00 GEN`

Finalized state showed:

- winning position `claimed = true`
- `paid_out = 2000000000000000000`
- `remaining_liability = 0`

The payout matched the complete two-sided market pool.

## Fail-closed evidence handling

### Contradictory evidence

Transaction:

`0x3249d7039e7b09560c58a147008cdbb69d6181da4c0ea6557b5aaf3b114fbe59`

Execution rejected settlement as inconclusive:

`versioned evidence is inconclusive; cancel after evidence expiry or deadline`

Finalized state remained:

- status: `closed`
- outcome: `none`
- confidence: `0`

No settlement occurred.

### Provenance / source-digest mismatch

Transaction:

`0xe373cc5a97f64e5df3aa0e77f42b37513894379f3aa4e0505c50976cd2c3ac5d`

Execution rejected the record with:

`corroboration evidence source digest does not match`

Finalized market state remained unresolved.

### Malformed evidence

Transaction:

`0xb473576704f4d125816736a308dc0393cf1506c28a33b1ecf9820463cbcf857b`

Execution rejected the record with:

`primary evidence headers are incomplete`

The malformed record did not produce a settlement.

## Additional consensus observation

During valid NO-evidence qualification, transaction

`0x8af414ce97f6ff634669ca70317b93d0be986ed6a3bbcafe99f0968e17e962dc`

produced the canonical execution result:

- state: `resolved`
- outcome: `no`
- confidence: `10000`

The Bradbury consensus path later finalized as undetermined, and Finalized contract state remained closed and unresolved. This is recorded as a network consensus observation and is not used as successful settlement evidence.

## Cancellation and collateral recovery

Markets used for negative and consensus-path verification were cancelled after their applicable resolution windows.

Cancelled positions were refunded at their original stake values.

The valid-NO qualification market ultimately showed:

- `refunded = 2000000000000000000`
- `remaining_liability = 0`
- status: `cancelled`

The remaining negative-test markets were also cancelled and their positions were reclaimed.

## Final accounting

After cleanup, Finalized reads returned:

- `accounted_balance = 0`
- `contract_balance = 0`

No live qualification collateral remains in the corrected deployment.

## Local release verification

The release gate was rerun from a clean clone of `origin/main`.

Results:

- Python invariant suite: **17 tests passed**
- frontend production build: **passed**
- `npm audit --omit=dev`: **0 vulnerabilities**
- `git diff --check`: **clean**

The invariant suite covers evidence binding, freshness, canonical output, record parsing, nondeterminism boundaries, cancellation, refunds, and payout conservation.

## Qualification scope

This report records the live Bradbury scenarios and release checks actually used to validate the reviewer-requested evidence-binding remediation.

Execution results, consensus outcomes, and Finalized contract state are kept separate where those distinctions are material.

## Release conclusion

The corrected deployment demonstrates that:

- authoritative evidence can be bound to immutable versioned records;
- freshness is explicitly enforced;
- corroboration is repository-separated;
- settlement metadata is bound to the market configuration;
- contradictory, mismatched, or malformed evidence fails closed;
- valid evidence can produce a finalized settlement;
- winner payout conserves the full market pool;
- cancellation and refunds conserve collateral;
- final contract liability and contract balance return to zero.

**Current Bradbury deployment:**
`0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF`
