"use client"

import { useState, useCallback } from "react"
import { DynamicWidget, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core"
import {
  CHAIN_ID,
  SUPPORTED_TOKEN_TYPE,
} from "@particle-network/universal-account-sdk"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  UniversalAccountProvider,
  useUniversalAccount,
} from "@/hooks/universal-account-provider"
import BalanceDialog from "@/components/balance-dialog"

function Spinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200" />
    </div>
  )
}

function CopyButton({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 rounded px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

function UserInfoCard() {
  const { accountInfo, primaryAssets, refreshBalance } = useUniversalAccount()
  const { primaryWallet } = useDynamicContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showBalanceDialog, setShowBalanceDialog] = useState(false)

  const address = primaryWallet?.address ?? null

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    await refreshBalance()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [refreshBalance])

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Address
          </span>
          {address && <CopyButton text={address} />}
        </div>
        <p className="mb-3 break-all font-mono text-sm text-zinc-800 dark:text-zinc-200">
          {address || "Fetching address..."}
        </p>

        <div className="mb-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Solana Address
          </span>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Deposit SOL/USDC here -- counts toward your unified balance.
          </p>
        </div>
        <p className="mb-3 break-all font-mono text-sm text-zinc-800 dark:text-zinc-200">
          {accountInfo.solanaSmartAccount || "Fetching address..."}
        </p>

        <div className="mb-1 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Unified Balance
          </span>
          {isRefreshing ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          ) : (
            <button
              onClick={refresh}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Refresh
            </button>
          )}
        </div>
        <p
          className="cursor-pointer font-mono text-sm text-zinc-800 dark:text-zinc-200"
          onClick={() => primaryAssets && setShowBalanceDialog(true)}
        >
          ${primaryAssets?.totalAmountInUSD?.toFixed(4) ?? "0.00"} USD
          {primaryAssets && (
            <span className="ml-2 text-[11px] text-zinc-400">
              View breakdown
            </span>
          )}
        </p>
      </div>

      {showBalanceDialog && primaryAssets && (
        <BalanceDialog
          assets={primaryAssets}
          onClose={() => setShowBalanceDialog(false)}
        />
      )}
    </>
  )
}

function DelegationCard() {
  const { universalAccount, isDelegated, ensureDelegated, loading } =
    useUniversalAccount()
  const [delegating, setDelegating] = useState(false)

  const handleDelegate = useCallback(async () => {
    if (!universalAccount) return
    setDelegating(true)
    try {
      await ensureDelegated()
      toast.success("Delegation on Arbitrum succeeded!")
    } catch (err: unknown) {
      console.error("Delegation failed:", err)
      toast.error("Delegation failed: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDelegating(false)
    }
  }, [universalAccount, ensureDelegated])

  if (loading) return <Spinner />

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
          Arbitrum (42161)
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: isDelegated ? "#22c55e" : "#ef4444" }}
        >
          {isDelegated ? "Delegated" : "Not delegated"}
        </span>
      </div>

      {!isDelegated && (
        <button
          onClick={handleDelegate}
          disabled={delegating || !universalAccount}
          className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {delegating ? "Delegating..." : "Delegate on Arbitrum"}
        </button>
      )}
    </div>
  )
}

function ConvertCard() {
  const { universalAccount, isDelegated, refreshBalance, signAndSend, loading } =
    useUniversalAccount()
  const [amount, setAmount] = useState("1")
  const [sending, setSending] = useState(false)
  const [txUrl, setTxUrl] = useState("")

  const handleConvert = useCallback(async () => {
    if (!universalAccount || !amount) return
    setSending(true)
    try {
      const transaction = await universalAccount.createConvertTransaction({
        expectToken: { type: SUPPORTED_TOKEN_TYPE.USDC, amount },
        chainId: CHAIN_ID.SOLANA_MAINNET,
      })
      const result = await signAndSend(transaction)
      const url = `https://universalx.app/activity/details?id=${result.transactionId}`
      setTxUrl(url)
      toast.success("Convert transaction sent!")
      await refreshBalance()
    } catch (err: unknown) {
      console.error("Convert transaction failed:", err)
      toast.error("Transaction failed: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSending(false)
    }
  }, [universalAccount, amount, signAndSend, refreshBalance])

  if (loading) return <Spinner />

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        USDC to receive on Solana
      </span>
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="USDC amount"
        className="mb-3 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500"
      />
      <button
        onClick={handleConvert}
        disabled={sending || !universalAccount || !amount || !isDelegated}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {sending ? "Converting..." : `Convert ${amount || "0"} USDC to Solana`}
      </button>
      {!isDelegated && (
        <p className="mt-1.5 text-[11px] text-zinc-400">
          Delegate your EOA first (Step 2).
        </p>
      )}
      {txUrl && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] text-zinc-400">Transaction:</p>
          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-[11px] text-blue-500 hover:underline"
          >
            {txUrl}
          </a>
        </div>
      )}
    </div>
  )
}

function Step({
  step,
  title,
  description,
  isLast,
  children,
}: {
  step: number
  title: string
  description: string
  isLast?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          {step}
        </div>
        {!isLast && (
          <div className="mt-2 w-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        )}
      </div>
      <div className="flex-1 pb-8">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <p className="mb-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
        {children}
      </div>
    </div>
  )
}

function Dashboard() {
  const { handleLogOut } = useDynamicContext()
  const { loading } = useUniversalAccount()

  return (
    <div className="space-y-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Universal Account
        </h2>
        <button
          onClick={() => handleLogOut()}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          Sign Out
        </button>
      </div>

      {loading && <Spinner />}

      <Step
        step={1}
        title="Social Login"
        description="Dynamic creates an EOA wallet from a social login. Deposit ETH on Arbitrum to your address to fund the account."
      >
        <UserInfoCard />
      </Step>

      <Step
        step={2}
        title="Upgrade EOA to Universal Account"
        description="Use EIP-7702 to delegate the Dynamic EOA on Arbitrum, upgrading it to a Particle Universal Account with chain abstraction."
      >
        <DelegationCard />
      </Step>

      <Step
        step={3}
        title="Convert Assets Cross-Chain"
        description="With the EOA upgraded, use the Universal Account to convert your Arbitrum ETH into USDC on Solana in a single transaction."
        isLast
      >
        <ConvertCard />
      </Step>
    </div>
  )
}

function LoginView() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Sign In
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Connect with an embedded wallet to get started.
      </p>
      <DynamicWidget />
    </div>
  )
}

function AppContent() {
  const isLoggedIn = useIsLoggedIn()
  const { primaryWallet } = useDynamicContext()

  if (isLoggedIn && primaryWallet) {
    return (
      <UniversalAccountProvider>
        <Dashboard />
      </UniversalAccountProvider>
    )
  }

  return <LoginView />
}

export function WalletApp() {
  return (
    <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <AppContent />
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        theme="dark"
      />
    </div>
  )
}
