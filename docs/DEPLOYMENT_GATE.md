# Deployment Gate

Do not resubmit until every gate is complete.

## Source Gate

1. Run the Python unit suite and compilation checks.
2. Run `npm run build` and `npm audit` in `frontend`.
3. Run GenVM lint on the exact deployment file.
4. Confirm the resolver uses one `strict_eq` callback containing exactly two
   renders and one policy judgment, with no nested non-determinism, storage
   writes, or transfers.
5. Record the commit SHA and SHA-256 of `contracts/outcome_market.py`.

## Evidence Gate

1. Publish a primary and corroborating fixture in different repositories.
2. Pin both raw URLs to full lowercase commit SHAs.
3. Record the named authority, HTTPS authoritative source, observation time,
   and lowercase 64-character source digest before market creation.
4. Confirm both records use the exact canonical header set, contain no
   `Outcome` header, include a non-empty evidence body, and remain current for
   the full resolution window.
5. Independently retain the original source bytes and off-chain SHA-256
   calculation so reviewers can reproduce the creator-declared digest.

## Bradbury Gate

1. Deploy the exact committed corrected source as a new contract.
2. Record the new address and accepted deployment transaction.
3. Verify Explorer source matches the repository byte-for-byte.
4. Run the full smoke matrix in `TEST_PLAN.md`.
5. Wait for finalization and verify execution results, not consensus labels
   alone.
6. Confirm complete resolved and cancelled flows return
   `accounted_balance()` to zero.
7. Demonstrate that stale observations, provenance mismatches, record-supplied
   outcomes, and contradictory evidence all fail without changing market state.

## Frontend Gate

1. Set `VITE_CONTRACT_ADDRESS` to the new corrected Bradbury address.
2. Redeploy the app and verify its explorer link targets that address.
3. Confirm malformed, zero, legacy, or missing addresses leave corrected writes
   disabled.
4. Exercise create, stake, close, resolve, cancel, and claim from the deployed
   app.

## Submission Gate

The resubmission Explorer link must be the new corrected address. Do not reuse
the legacy address. Update `TEST_REPORT.md` only with observed hashes and
finalized results; never insert placeholders or describe a pending test as
passed.
