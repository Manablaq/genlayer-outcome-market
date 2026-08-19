# Bradbury Smoke Fixtures

These records are public, immutable test fixtures for the corrected Bradbury
contract. The full 40-character commit SHA is part of every URL. A market must
register URLs exactly as shown; a branch URL, shortened SHA, or copied file is
not a valid fixture.

## Shared provenance

| Field | Value |
| --- | --- |
| Authority | GenLayer Labs |
| Source | [`optimistic-democracy-how-genlayer-works.mdx`](https://raw.githubusercontent.com/genlayerlabs/genlayer-docs/9699f3900dd697689090f6595f5c14b4f0a60fdf/pages/understand-genlayer-protocol/optimistic-democracy-how-genlayer-works.mdx) |
| Source commit | [`9699f3900dd697689090f6595f5c14b4f0a60fdf`](https://github.com/genlayerlabs/genlayer-docs/commit/9699f3900dd697689090f6595f5c14b4f0a60fdf) |
| Source SHA-256 | `844d219afb599bc08c51d9580458bf88d68f8f9947aa90562f9aa3dfc4c26a0e` |
| Observation timestamp | `1787104700` |
| Publication timestamp | `1787104766` |
| Standard fixture expiry | `1787709566` |

The source says that an accepted transaction enters the appeal window and that
a finalized transaction is permanent and irreversible. The source bytes are
retained by its pinned commit; `node scripts/verify-evidence-fixtures.mjs`
re-fetches and hashes them.

## Positive resolution fixtures

| Scenario | Primary record | Corroborating record | Expected result |
| --- | --- | --- | --- |
| YES: finalization is permanent after appeal | [`finality-yes`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-primary/e2d9fa8ca4228a44a7b30f4213fc09ea7fc7051f/records/finality-yes.txt) | [`finality-yes`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-corroboration/b0b4e3466abd2318c37be220ef5ae2f56e1a6002/records/finality-yes.txt) | Resolve YES, then claim |
| NO: acceptance is not final before appeal closes | [`accepted-no`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-primary/e2d9fa8ca4228a44a7b30f4213fc09ea7fc7051f/records/accepted-no.txt) | [`accepted-no`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-corroboration/b0b4e3466abd2318c37be220ef5ae2f56e1a6002/records/accepted-no.txt) | Resolve NO, then claim |

## Negative fixtures

| Scenario | Primary record | Corroborating record | Expected result |
| --- | --- | --- | --- |
| Contradictory bodies | [`primary YES`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-primary/e2d9fa8ca4228a44a7b30f4213fc09ea7fc7051f/records/negative/contradictory.txt) | [`contradictory NO`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-corroboration/b0b4e3466abd2318c37be220ef5ae2f56e1a6002/records/negative/contradictory.txt) | Reject with market unchanged |
| Metadata mismatch | [`canonical metadata`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-primary/e2d9fa8ca4228a44a7b30f4213fc09ea7fc7051f/records/negative/metadata-mismatch.txt) | [`wrong source digest`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-corroboration/b0b4e3466abd2318c37be220ef5ae2f56e1a6002/records/negative/metadata-mismatch.txt) | Reject with market unchanged |
| Record-supplied outcome | [`forbidden Outcome header`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-primary/e2d9fa8ca4228a44a7b30f4213fc09ea7fc7051f/records/negative/outcome-header.txt) | [`canonical companion`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-corroboration/b0b4e3466abd2318c37be220ef5ae2f56e1a6002/records/negative/outcome-header.txt) | Reject with market unchanged |
| Expiry/cancellation | [`short-lived record`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-primary/e2d9fa8ca4228a44a7b30f4213fc09ea7fc7051f/records/expiry-test.txt) | [`short-lived record`](https://raw.githubusercontent.com/Manablaq/genlayer-evidence-corroboration/b0b4e3466abd2318c37be220ef5ae2f56e1a6002/records/expiry-test.txt) | After expiry, reject resolution and allow exact refunds |

## Important limitation

The contract enforces distinct repositories, not distinct maintainers. Both
fixture repositories belong to the application owner and are intentionally
transparent test ledgers. They demonstrate the immutable-record, freshness,
and corroboration mechanics; they do not independently establish a production
oracle. A production market should use repositories controlled by vetted,
independent publishers or signed records issued by the named authority.
