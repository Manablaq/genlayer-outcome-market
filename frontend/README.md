# Outcome Market Frontend

Vite and React interface for the Outcome Market contract on GenLayer Bradbury.

## Contract configuration

Create `frontend/.env.local` from `.env.example` and set the full corrected deployment address:

```bash
VITE_CONTRACT_ADDRESS=0xYOUR_CORRECTED_BRADBURY_ADDRESS
```

The application fails closed for writes when the value is missing, malformed, the zero address, or the known legacy address. Legacy market data remains readable for historical transparency, but the UI will not create or resolve markets against that deployment.

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

1. Deploy the corrected contract source to Bradbury.
2. Add `VITE_CONTRACT_ADDRESS` to the production environment.
3. Redeploy the frontend from the matching repository commit.
4. Verify the contract link opens the corrected Explorer address.
5. Exercise a read and write flow before publishing submission evidence.
