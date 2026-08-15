# Bradbury Test Report

## Deployment

- Contract: `0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4`
- Network: GenLayer Bradbury Testnet
- Deployment transaction:
  `0x4ed3dfc0a39aa2c82322c7c4698f1d11e121c8160b3409e665085e7541cc0228`
- Initial reads: `get_market_count() = 0`, `accounted_balance() = 0`

## Completed Bradbury Scenarios

### One-sided cancellation and exact refund

Market `0` was created with a deterministic cancellation policy, funded only
on YES, then cancelled and claimed. The final state recorded
`refunded = 1000000000000000`, `remaining_liability = 0`, and
`accounted_balance() = 0`.

- Create: `0x996fc67e20038b42f38ce17035e80a785b0ffda12256ebe8eecd960aae4f5278`
- YES position: `0x12cba3c7786b43bd4db0883fa0327f21b15beda3722a92616aa0cc1411b0336b`
- Cancel: `0x664e64434c986e0be5c130c58858fb72ca22d304b8d7a23dccfc8eead6c5f42e`
- Claim refund: `0x90fc51d02b07d7c363e0cb2f13f0158dca5ee41d14f2b82f09fc2341daaabf61`

### Two-sided expiry cancellation and exact refunds

Market `1` accepted both YES and NO collateral. Its resolution deadline passed
without a successful resolution, so it cancelled and both positions claimed
their exact original stakes. The final state recorded
`refunded = 2000000000000000`, `remaining_liability = 0`, and
`accounted_balance() = 0`.

- Create: `0x5ade3561bec0cff5798511ef332eb6534a6ffebdc3e15f8a822e8443ee344023`
- YES position: `0xef16a47b0a6538249381ee6472be39fd8be3373e8719280f9d303b68d1e9da04`
- NO position: `0x930da2aa3830fae45a587ecdacb40166299b13b2aea4d993453df61d02d930e2`
- Cancel: `0x39dd7b89f56c3a8972f66053d3682b76d1bc91f4ff4fc1f646d1392771b273fe`
- YES refund claim: `0xf23f8cc4c4f787fb85c819e56f47f69bbd42809c3069cfcea2d5a8da17d70303`
- NO refund claim: `0xc6cc9afaed0cbefa246de3e1b40caf0b7ec1165e11e95685b83a97fa2c4eac34`

### Two-sided source resolution and winning claim

Market `5` used IANA's Example Domains page as its registered public source.
The market closed with `0.1 GEN` on YES and `0.1 GEN` on NO. The on-chain
resolver returned the canonical result `resolved / yes / 10000` after
independent source review under the registered policy. The YES position was
then claimed successfully.

The final contract-backed state displayed by the application was:

- Status: `resolved`
- Outcome: `yes`
- Confidence: `10000` bps
- Paid out: `0.2 GEN`
- Refunded: `0 GEN`
- Remaining liability: `0 GEN`

This exercises the consequential source-resolution path separately from the
cancellation tests: validators determine only the canonical outcome and
confidence, while the contract derives the exact `0.2 GEN` claim from the
locked pools.

## Frontend Verification

The `frontend` app uses `genlayer-js` 1.1.8 with the documented Bradbury read
client and EIP-1193 provider-backed write client. It waits for an `ACCEPTED`
receipt and requires `FINISHED_WITH_RETURN` before presenting a write as
successful.

Verified locally on 2026-08-14:

```sh
cd frontend
npm run build
npm audit --omit=dev
```

The TypeScript check and Vite production build passed. The production audit
reported `found 0 vulnerabilities`.
