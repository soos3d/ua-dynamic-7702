"use client"

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum"

const ARBITRUM_NETWORK = {
  chainId: 42161,
  networkId: 42161,
  name: "Arbitrum One",
  iconUrls: ["https://app.dynamic.xyz/assets/networks/arbitrum.svg"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://arb1.arbitrum.io/rpc"],
  blockExplorerUrls: ["https://arbiscan.io"],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic SDK's NetworksOverrides expects GenericNetwork[] which is not exported
function ensureArbitrum(networks: any[]) {
  if (networks.some((n) => n.chainId === 42161)) return networks
  return [...networks, ARBITRUM_NETWORK]
}

export function Providers({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
        walletConnectors: [EthereumWalletConnectors],
        walletsFilter: (wallets) =>
          wallets.filter((w) => w.key === "dynamicEmail"),
        overrides: { evmNetworks: ensureArbitrum },
      }}
    >
      {children}
    </DynamicContextProvider>
  )
}
