# Outcome Market Test Plan

This plan verifies the corrected evidence-bound release before it is submitted for review. A release passes only when the repository source, deployed source, frontend configuration, and recorded Bradbury behavior all match.

## 1. Local release gate

Run from the repository root:

```bash
PYTHONPYCACHEPREFIX=/private/tmp/outcome-market-pycache \
  python3 -m py_compile contracts/outcome_market.py tests/test_outcome_market_invariants.py

PYTHONPYCACHEPREFIX=/private/tmp/outcome-market-pycache \
  python3 -m unittest discover -s tests -p 'test_outcome_market_invariants.py' -v

cd frontend
npm ci
npm run build
npm audit --omit=dev
```

Then run `git diff --check` from the repository root.

## 2. Contract invariant coverage

The automated suite must prove:

1. Resolution accepts only the canonical result schema.
2. Every consequential result field is compared exactly.
3. Unexpected or mismatched result fields are rejected.
4. Evidence records must use the exact canonical header set and bind schema,
   record ID, question, policy, authority, authoritative source, source
   observation, source digest, publication, and expiry.
5. Record bodies must be non-empty, and any record-supplied `Outcome` header is
   rejected.
6. Evidence URLs must be immutable raw GitHub URLs pinned to full 40-character
   commit SHAs.
7. Primary and corroborating records must come from different repositories.
8. Source observation must not follow publication, and publication must occur
   no more than 24 hours after observation.
9. Publication and expiry windows are checked at market creation and
   resolution; expired evidence cannot settle a market.
10. Contradictory or inconclusive bodies cannot produce a settlement.
11. Malformed independent policy judgments fail closed.
12. Resolution performs exactly two renders and one policy judgment inside one
   validator callback.
13. The validator callback performs no storage writes or transfers.
14. The canonical payload binds every provenance field plus the independently
   derived outcome and confidence.
15. Payouts are derived only from recorded pools and winning positions.
16. Cancellation and one-sided-market refunds return exact unclaimed stakes.
17. A provenance or source-digest mismatch cannot change market state.

## 3. GenVM checks

Before deployment, run the current GenVM lint/deployment preflight against `contracts/outcome_market.py` and retain the complete output. The release must have no forbidden nested non-determinism and no storage writes inside the non-deterministic callback.

## 4. Bradbury smoke matrix

Use the newly deployed corrected contract. Do not reuse the legacy deployment.

| ID | Scenario | Expected result |
|---|---|---|
| B1 | Create with a branch, tag, web page, or short Git SHA URL | Rejected |
| B2 | Create with both evidence records from the same repository | Rejected |
| B3 | Create with observation after publication, observation over 24 hours old, future publication, expired record, deadline beyond expiry, or validity over 31 days | Rejected |
| B4 | Create with two matching, fresh, commit-pinned records whose bodies support YES | Accepted |
| B5 | Resolve B4 after close | `resolved`, outcome `yes`, confidence `10000` |
| B6 | Claim a winning B4 position | Exact pool-derived payout; liability decreases by the same amount |
| B7 | Create with two matching, fresh, commit-pinned records whose bodies support NO | Accepted |
| B8 | Resolve B7 after close | `resolved`, outcome `no`, confidence `10000` |
| B9 | Resolve records whose bodies support contradictory decisions | Transaction fails; market remains unresolved |
| B10 | Resolve records with mismatched authority, source, observation, digest, ID, question, policy, or timestamps | Transaction fails; market remains unresolved |
| B11 | Resolve a record with an `Outcome` header, missing header, extra header, or empty body | Transaction fails; market remains unresolved |
| B12 | Let evidence expire before resolution | Resolution rejected; cancellation enabled |
| B13 | Cancel and claim refunds | Each position receives its exact original unclaimed stake |
| B14 | Complete all claims/refunds | `accounted_balance` returns `0` |

For each row, record the transaction ID, status, relevant read-method output, and finalization state in [TEST_REPORT.md](TEST_REPORT.md).

## 5. Source and frontend match

Before resubmission:

- Compare the Explorer source with the repository contract byte-for-byte.
- Record the repository commit SHA used for deployment.
- Set `VITE_CONTRACT_ADDRESS` to the corrected Bradbury address.
- Build and redeploy the frontend.
- Confirm the production site links to the corrected Explorer address.
- Confirm the UI refuses resolution for legacy, unversioned, or expired evidence.

## Pass condition

Submission is ready only when every local check passes, GenVM preflight is clean, the required Bradbury rows are finalized, and all public links point to the corrected matching release.
