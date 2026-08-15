# Outcome Market App

The browser app is a direct Bradbury interface for the deployed Outcome Market
contract at `0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4`.

## What it does

- Reads the market index, market state, pools, and account positions through
  `genlayer-js` `readContract` calls.
- Connects an EIP-1193 browser wallet and uses the SDK's documented
  provider-backed `writeContract` flow for every state-changing call.
- Waits for an `ACCEPTED` receipt and explicitly requires
  `FINISHED_WITH_RETURN` before reporting a write as successful.
- Exposes the full contract lifecycle: market creation, YES/NO positions,
  closure, source-backed resolution, cancellation, and claims.
- Provides a responsive product experience around those direct contract calls:
  an evidence-focused landing page, searchable market explorer, status filters,
  local watchlists, expandable policy inspection, and a built-in developer
  reference.
- Includes a persisted light/dark theme and motion that automatically reduces
  when the visitor has enabled reduced-motion preferences.

## Product navigation

- **How it works** documents the on-chain lifecycle from immutable market
  registration through exact claim or refund paths.
- **Markets** is the operational workspace. Search and filters are local UI
  conveniences; market state, positions, collateral, and lifecycle actions are
  always read from or sent to the contract.
- **Documentation** explains the contract boundary and includes a minimal
  `genlayer-js` read example. The explorer link always points to the deployed
  contract, not a copied interface definition.

The watchlist and color theme are stored only in the current browser's local
storage. They never create on-chain state and do not affect market settlement.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

When the default Vite port is occupied, Vite selects the next available local
port and prints it in the terminal. The app includes `outcome-market-hero.png`
as a local public asset, so no third-party image host is required for the
landing page.

The wallet must be on GenLayer Bradbury. When a transaction requires GEN
collateral, enter a decimal GEN amount in the app; it is converted to integer
wei before the payable contract call is sent.

## Safety boundary

The UI never calculates or selects a settlement payout. It displays the
contract's pools and lifecycle fields. Resolution happens on-chain: the
contract snapshots the registered source policy, validators independently fetch
and evaluate it, and strict equivalence binds the canonical outcome and
confidence before settlement state is stored.
