# EIP-7702 Universal Account Demo

A working demo that turns an **embedded EOA wallet** (Dynamic) into a **Particle Network Universal Account** using [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) delegation -- then executes a cross-chain conversion in a single transaction.

## What This Demo Shows

### The problem

Traditional EOA wallets are limited to the chain they live on. If a user has ETH on Arbitrum and wants USDC on Solana, they need to bridge, swap, and manage gas on multiple chains manually.

### The solution: EIP-7702 + Universal Accounts

EIP-7702 lets an EOA delegate its execution to a smart contract **without deploying a new account**. The EOA keeps its address and assets, but gains smart account capabilities. Particle's Universal Account SDK uses this to give any EOA **chain-abstracted** powers: a unified balance across EVM chains and Solana, and the ability to move assets cross-chain in one step.

### The three-step flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. LOGIN                                                           │
│     User authenticates via Dynamic (social login, email, etc.)      │
│     → Dynamic creates an embedded WaaS wallet (EOA) on Arbitrum     │
│     → User deposits ETH to fund the account                        │
├─────────────────────────────────────────────────────────────────────┤
│  2. DELEGATE (EIP-7702)                                             │
│     User clicks "Delegate on Arbitrum"                              │
│     → Signs a 7702 authorization (contract + chainId + nonce)       │
│     → Sends a Type-4 transaction with the authorization             │
│     → EOA now executes via Particle's Universal Account contract    │
│     → Same address, same keys, but now a smart account              │
├─────────────────────────────────────────────────────────────────────┤
│  3. CONVERT CROSS-CHAIN                                             │
│     User enters USDC amount and clicks "Convert to Solana"          │
│     → UA SDK builds the transaction (routing, bridging, swapping)   │
│     → User signs the rootHash + any inline 7702 authorizations      │
│     → Single sendTransaction() call handles everything              │
│     → ETH on Arbitrum becomes USDC on Solana                        │
└─────────────────────────────────────────────────────────────────────┘
```

## How EIP-7702 Delegation Works

EIP-7702 introduces a new transaction type (Type-4) that sets an EOA's `code` field to point to a smart contract. After delegation:

- The EOA address stays the same
- The private key still controls the account
- But transactions execute through the delegated contract's logic
- This is reversible -- the user can re-delegate or clear delegation

In this demo, delegation targets **Particle's Universal Account contract on Arbitrum**. Once delegated, the EOA natively acts as a Universal Account with a unified balance and cross-chain capabilities.

```
ensureDelegated()
  → universalAccount.getEIP7702Deployments()     // Check current status
  → universalAccount.getEIP7702Auth([42161])      // Get contract address + nonce
  → waasConnector.signAuthorization(...)          // Dynamic WaaS signs the auth
  → primaryWallet.switchNetwork(42161)            // Ensure Arbitrum is active
  → walletClient.sendTransaction({                // Send Type-4 tx with auth list
      authorizationList: [authorization],
      to: userAddress, data: "0x"
    })
  → refreshDelegationStatus()                     // Verify delegation succeeded
```

Delegation is a **one-time operation per chain**. After this, the EOA natively acts as a Universal Account.

## How the Cross-Chain Convert Works

Once delegated, the Universal Account SDK can build complex cross-chain transactions. The user only needs to sign once:

```
handleConvert()
  → universalAccount.createConvertTransaction({
      expectToken: { type: USDC, amount },
      chainId: SOLANA_MAINNET
    })
  → signAndSend(transaction)
      → For each userOp with eip7702Auth (not already delegated):
          waasConnector.signAuthorization() → Signature.from() → serialize
      → walletClient.signMessage({ raw: rootHash })  // Single user signature
      → universalAccount.sendTransaction()            // SDK handles routing + execution
```

The SDK determines the optimal route (which chains to touch, which bridges/swaps to use) and packages everything into `userOps` that the Universal Account infrastructure executes. The user signs one `rootHash` that covers all operations.

## Dynamic WaaS Integration Notes

This demo uses Dynamic's **WaaS (Wallet-as-a-Service)** embedded wallets, which provide EIP-7702 support via `signAuthorization()`. Key integration details:

- **WaaS connector detection**: Uses `isDynamicWaasConnector()` to verify the wallet supports 7702 signing
- **getSigner() workaround**: Dynamic's `signAuthorization()` calls `getSigner()` which returns a signer without `.account`, causing a crash. The provider patches `getSigner` to inject `signer.account.address` before each authorization call (see `hooks/universal-account-provider.tsx`)
- **Network switching**: `primaryWallet.switchNetwork(42161)` is called before the delegation transaction to ensure the wallet is on Arbitrum
- **Signature format**: Dynamic returns `{r, s, v}` from `signAuthorization()` -- ethers' `Signature.from()` serializes this for the UA SDK

## Quick Start

```bash
yarn install
# Create .env.local with your keys (see below)
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Yes | Dynamic environment ID ([app.dynamic.xyz](https://app.dynamic.xyz/) → Settings → API) |
| `NEXT_PUBLIC_PROJECT_ID` | Yes | Particle project ID ([dashboard.particle.network](https://dashboard.particle.network)) |
| `NEXT_PUBLIC_CLIENT_KEY` | Yes | Particle client key |
| `NEXT_PUBLIC_APP_ID` | Yes | Particle app UUID |

## Project Structure

```
app/
├── layout.tsx                        # Root layout, wraps with Providers
└── page.tsx                          # Entry — renders WalletApp

components/
├── providers.tsx                     # DynamicContextProvider config (Arbitrum network)
├── wallet-app.tsx                    # Login view + 3-step dashboard (UserInfo, Delegation, Convert)
└── balance-dialog.tsx                # Unified balance breakdown dialog

hooks/
└── universal-account-provider.tsx    # Core integration: UA init, delegation, sign+send

types/
└── particle-network.d.ts            # Ambient types for @particle-network/universal-account-sdk
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@dynamic-labs/sdk-react-core` + `ethereum` + `waas-evm` | Auth + embedded WaaS wallet + EIP-7702 signing |
| `@particle-network/universal-account-sdk` | Universal Account creation, balance, transactions |
| `ethers` v6 | Signature serialization (`Signature.from`) for 7702 authorizations |
| `next` (15) | Framework (App Router) |

## Further Reading

- [`docs/CONTRIB.md`](./docs/CONTRIB.md) — development workflow, scripts, environment setup
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — deployment, common issues, troubleshooting


