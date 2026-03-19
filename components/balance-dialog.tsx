"use client"

import { type IAssetsResponse } from "@particle-network/universal-account-sdk"

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB Chain",
  101: "Solana",
  137: "Polygon",
  146: "Sonic",
  143: "Trax",
  196: "X Layer",
  324: "zkSync",
  999: "Zora",
  5000: "Mantle",
  8453: "Base",
  9745: "Zeta",
  42161: "Arbitrum",
  43114: "Avalanche",
  59144: "Linea",
  80094: "Berachain",
}

const chainName = (chainId: number) =>
  CHAIN_NAMES[chainId] ?? `Chain ${chainId}`

type Props = {
  assets: IAssetsResponse
  onClose: () => void
}

type Asset = IAssetsResponse["assets"][number]
type ChainEntry = Asset["chainAggregation"][number]

export default function BalanceDialog({ assets, onClose }: Props) {
  const tokensWithBalance = assets.assets.filter((a) => a.amount > 0)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">
            Unified Balance
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="mb-5 text-center font-mono text-xl font-semibold text-zinc-100">
          ${assets.totalAmountInUSD?.toFixed(4)} USD
        </div>

        {tokensWithBalance.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            No tokens found.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {tokensWithBalance.map((asset: Asset) => (
              <div key={asset.tokenType}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase text-zinc-100">
                    {asset.tokenType}
                  </span>
                  <span className="font-mono text-xs text-zinc-300">
                    {asset.amount} (${asset.amountInUSD.toFixed(2)})
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {asset.chainAggregation
                    .filter((c: ChainEntry) => c.amount > 0)
                    .map((chain: ChainEntry) => (
                      <div
                        key={chain.token.chainId}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2 text-xs"
                      >
                        <span className="text-zinc-400">
                          {chainName(chain.token.chainId)}
                        </span>
                        <span className="font-mono text-zinc-100">
                          {chain.amount} (${chain.amountInUSD.toFixed(2)})
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
