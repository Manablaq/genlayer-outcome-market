# Deployment Gate

Do not deploy this backend to Bradbury until every item below is complete.

## Source Gate

1. Run `python3 -m unittest discover -s tests -v`.
2. Run `PYTHONPYCACHEPREFIX=/private/tmp/outcome-market-pycache python3 -m py_compile contracts/outcome_market.py`.
3. Review `contracts/outcome_market.py` for exactly one `strict_eq` resolution
   call and no `run_nondet_unsafe` resolver.
4. In Studio, confirm GenVM lint reports no nested non-determinism or storage
   mutation in `_evaluate_resolution_snapshot`.

## Bradbury Gate

1. Deploy the exact committed source through GenLayer Studio.
2. Record contract address, deployment transaction hash, commit SHA, file byte
   count, and SHA-256 in `docs/TEST_REPORT.md`.
3. Complete the negative and positive scenarios in `docs/TEST_PLAN.md`.
4. Wait for finalization and verify each write's execution result, not merely
   its consensus status.
5. For both a complete resolved market and a complete cancelled market, verify
   `accounted_balance()` is zero.

The frontend can expose the completed deterministic flows after their Bradbury
tests pass, but it must continue to label source resolution as pending until a
clear-source strict-consensus test is recorded. It must call `take_position`
with wallet `value` only, and it must not treat consensus status alone as a
successful state change.
