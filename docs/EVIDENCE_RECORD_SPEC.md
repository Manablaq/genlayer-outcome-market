# Evidence Record Specification

Outcome Market resolves only from canonical, versioned evidence records. A
normal web page, mutable branch URL, screenshot, or unversioned API response is
not settlement evidence.

## Authority And Publication

At creation, the market permanently registers a named authority, its HTTPS
source URL, when that source was observed, a 64-character lowercase source
digest, and two corroborating records. The records must be immutable GitHub raw
URLs pinned to exact commits and maintained in different repositories.

The source digest is a creator-declared SHA-256 fingerprint calculated off
chain from the observed authoritative bytes. The contract binds that digest
exactly across the market and both records, but it does not fetch the original
authoritative URL or recompute its digest. Reviewers must therefore audit the
capture procedure and authority claim. This is an explicit trust boundary, not
a claim of on-chain source authentication.

## Canonical Record

Each UTF-8 text record starts with exactly these headers in this order, followed
by a blank line and a non-empty evidence body:

```text
Outcome-Market-Evidence: outcome-market-evidence-v1
Record-ID: iana-example-domains-2026-08-18
Question: Are example.com and example.org maintained for documentation purposes?
Policy: Resolve YES only if the authoritative evidence explicitly states that both domains are maintained for documentation purposes; resolve NO only if it explicitly states the opposite; otherwise return inconclusive.
Authority: Internet Assigned Numbers Authority (IANA)
Authoritative-Source: https://www.iana.org/help/example-domains
Source-Observed-At: 1787036400
Evidence-Published-At: 1787040000
Evidence-Expires-At: 1787126400
Source-Digest: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

The authoritative page states that example.com and example.org are maintained
for documentation purposes. Capture notes and quotation context follow here.
```

An `Outcome` header is forbidden. Evidence records are untrusted inputs and
cannot select a winner or confidence. Validators independently evaluate each
body under the registered policy and must agree exactly on one derived result.

## URL Requirements

Both URLs must use:

```text
https://raw.githubusercontent.com/{owner}/{repository}/{40-character-lowercase-commit-sha}/{path}
```

Branch names such as `main`, tags, shortened hashes, redirects, and two files
from the same repository are rejected at market creation.

## Freshness Rules

- `Source-Observed-At` must not be later than `Evidence-Published-At`.
- Publication must occur no more than 24 hours after source observation.
- Publication cannot be in the future or later than market close.
- Evidence must be unexpired when the market is created and resolved.
- `Evidence-Expires-At` must be at or after the resolution deadline.
- The publication-to-expiry validity window cannot exceed 31 days.
- Expired evidence can never resolve a winner; it enables cancellation and
  exact refunds.

## Corroboration And Consensus

Validators independently fetch both records in one non-deterministic callback.
Each record must exactly match the immutable market snapshot on schema, record
ID, question, policy, authority, authoritative source, source observation,
publication, expiry, and source digest. The bodies are then evaluated
independently under the registered policy.

Resolution succeeds only when the two evaluations support the same canonical
YES or NO result and exact confidence. Contradiction, inconclusive evidence,
missing or extra headers, an `Outcome` header, empty evidence, fetch failure,
stale data, or any metadata mismatch causes the transaction to fail before a
storage write.

## Versioning A Record

A correction is a new commit and should normally use a new record ID or a new
market. An existing market cannot swap authority, source, digest, evidence
URLs, timestamps, question, or policy after trading begins.
