# Outcome Market Frontend

Vite and React interface for the Outcome Market contract on GenLayer Bradbury.

## Contract configuration

The production release defaults to the audited Bradbury address. To override it,
create `frontend/.env.local` from `.env.example` and provide a full address:

```bash
VITE_CONTRACT_ADDRESS=0xFE05AB8678F9EE7035E53579dE229CCed93FE5bF
```

An omitted value uses the audited release address compiled into the frontend.
An explicitly malformed, zero, or known legacy value fails closed and disables
writes. This prevents a broken production environment variable from silently
selecting an unintended contract.

## Local development

```bash
npm ci
npm run dev
```

Production verification:

```bash
npm run build
npm audit --omit=dev
```

## Evidence-aware behavior

The creation form requires:

- a named authority and authoritative HTTPS source;
- a source observation timestamp and 64-character lowercase source digest;
- a canonical record ID;
- two immutable raw GitHub URLs pinned to full commit SHAs;
- records from different repositories;
- publication and expiry timestamps;
- a resolution deadline no later than evidence expiry.

Evidence records cannot contain an `Outcome` header. They provide versioned,
corroborated provenance and non-empty evidence bodies; validators independently
apply the registered policy and derive the exact result and confidence.

Resolution controls are disabled when the deployment is legacy, evidence metadata is absent, or the evidence window is stale. The contract remains the final enforcement boundary; these checks make unsafe states visible before a transaction is attempted.

## Production deployment

1. Verify the finalized contract with `node scripts/verify-deployment.mjs` from
   the repository root.
2. Optionally set `VITE_CONTRACT_ADDRESS` to the audited release address in the
   production environment.
3. Redeploy the frontend from the verified repository commit.
4. Verify the contract link opens the corrected Explorer address.
5. Exercise a read and write flow before publishing submission evidence.
