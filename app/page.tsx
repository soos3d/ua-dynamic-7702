import { WalletApp } from "@/components/wallet-app"

export const dynamic = "force-dynamic"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <WalletApp />
    </div>
  )
}
