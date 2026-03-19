"use client"

import { useState } from "react"
import { DynamicWidget, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core"

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

function Dashboard() {
  const { primaryWallet, handleLogOut } = useDynamicContext()
  const address = primaryWallet?.address ?? null
  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h2>
        <button
          onClick={() => handleLogOut()}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          Sign Out
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Wallet Address
        </p>
        {address ? (
          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <code className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">
              {truncatedAddress}
            </code>
            <CopyButton text={address} />
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No wallet found</p>
        )}
      </div>
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
    return <Dashboard />
  }

  return <LoginView />
}

export function WalletApp() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <AppContent />
    </div>
  )
}
