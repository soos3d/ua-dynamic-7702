# Contributing & Development Guide

## Prerequisites

- Node.js 20+
- Yarn
- A [Dynamic](https://app.dynamic.xyz/) account (for the environment ID)
- A [Particle Network](https://dashboard.particle.network/) account (for project ID, client key, and app ID)

## Environment setup

Create a `.env.local` file in the project root with the following variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Yes | Dynamic environment ID from the [Dynamic dashboard](https://app.dynamic.xyz/) -> Settings -> API |
| `NEXT_PUBLIC_PROJECT_ID` | Yes | Project ID from the [Particle Network dashboard](https://dashboard.particle.network/) |
| `NEXT_PUBLIC_CLIENT_KEY` | Yes | Client key from the [Particle Network dashboard](https://dashboard.particle.network/) |
| `NEXT_PUBLIC_APP_ID` | Yes | App ID from the [Particle Network dashboard](https://dashboard.particle.network/) |

> `.env*` files are gitignored. Never commit credentials.

## Available scripts

Sourced from `package.json`:

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start local development server at http://localhost:3000 |
| `build` | `next build` | Production build (TypeScript and ESLint errors fail the build) |
| `start` | `next start` | Serve the production build locally |
| `lint` | `eslint` | Run ESLint across the project |

## Development workflow

1. Install dependencies:

```bash
yarn install
```

2. Create `.env.local` with all four environment variables listed above.

3. Start the dev server:

```bash
yarn dev
```

The app hot-reloads on file changes.

## Code structure

```
app/
  layout.tsx              Root layout, wraps with Providers
  page.tsx                Renders WalletApp
  globals.css             Global styles (Tailwind v4)

components/
  providers.tsx           Dynamic SDK configuration (Arbitrum network)
  wallet-app.tsx          Login form + dashboard with delegation and convert UI
  balance-dialog.tsx      Universal Account balance display dialog

hooks/
  universal-account-provider.tsx   Main integration layer: initializes UniversalAccount,
                                   manages delegation, balance fetching, transaction signing

types/
  particle-network.d.ts   Ambient type declarations for @particle-network/universal-account-sdk

docs/                     This folder
```

Key integration files:

| File | Purpose |
|------|---------|
| `hooks/universal-account-provider.tsx` | Core integration: initializes `UniversalAccount` from `@particle-network/universal-account-sdk`, handles EIP-7702 delegation, balance fetching, and cross-chain convert transactions |
| `components/providers.tsx` | Configures Dynamic SDK with Arbitrum network ensured in the network list |
| `components/wallet-app.tsx` | Main UI: social login, 3-step flow (login, delegate, convert) |
| `components/balance-dialog.tsx` | Displays Universal Account balances across chains |
| `types/particle-network.d.ts` | Type declarations for the Particle UA SDK (the SDK does not ship its own types) |

## Integration flow

The app demonstrates a 3-step EIP-7702 integration:

1. **Social Login** -- Dynamic creates an embedded MPC wallet (EOA on Arbitrum)
2. **EIP-7702 Delegation** -- `ensureDelegated()` sends a Type-4 transaction to delegate the EOA to Particle's Universal Account contract
3. **Cross-chain Convert** -- `createConvertTransaction()` + `signAndSend()` converts assets across chains via Particle UA

## Linting

```bash
yarn lint
```

ESLint is configured via `eslint.config.mjs` using the Next.js config preset.
