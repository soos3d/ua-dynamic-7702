"use client"

import {
  UniversalAccount,
  UNIVERSAL_ACCOUNT_VERSION,
  type IAssetsResponse,
} from "@particle-network/universal-account-sdk"
import { Signature } from "ethers"
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import { isEthereumWallet } from "@dynamic-labs/ethereum-core"
import { isDynamicWaasConnector } from "@dynamic-labs/wallet-connector-core"
import type { DynamicWaasEVMConnector } from "@dynamic-labs/waas-evm"

const ARBITRUM_CHAIN_ID = 42161

type AccountInfo = {
  ownerAddress: string
  evmSmartAccount: string
  solanaSmartAccount: string
}

type UAContextType = {
  universalAccount: UniversalAccount | null
  accountInfo: AccountInfo
  primaryAssets: IAssetsResponse | null
  isDelegated: boolean
  refreshBalance: () => Promise<void>
  ensureDelegated: () => Promise<void>
  undelegateEOA: () => Promise<void>
  signAndSend: (
    transaction: { rootHash: string } & Record<string, any>,
  ) => Promise<{ transactionId: string }>
  loading: boolean
}

const UAContext = createContext<UAContextType>({
  universalAccount: null,
  accountInfo: {
    ownerAddress: "",
    evmSmartAccount: "",
    solanaSmartAccount: "",
  },
  primaryAssets: null,
  isDelegated: false,
  refreshBalance: async () => {},
  ensureDelegated: async () => {},
  undelegateEOA: async () => {},
  signAndSend: async () => ({ transactionId: "" }),
  loading: false,
})

export const useUniversalAccount = () => useContext(UAContext)

export function UniversalAccountProvider({
  children,
}: {
  children: ReactNode
}) {
  const { primaryWallet } = useDynamicContext()
  const [universalAccount, setUniversalAccount] =
    useState<UniversalAccount | null>(null)
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    ownerAddress: "",
    evmSmartAccount: "",
    solanaSmartAccount: "",
  })
  const [primaryAssets, setPrimaryAssets] = useState<IAssetsResponse | null>(
    null,
  )
  const [isDelegated, setIsDelegated] = useState(false)
  const [loading, setLoading] = useState(false)

  const userAddress = primaryWallet?.address ?? null

  useEffect(() => {
    if (!userAddress) {
      setUniversalAccount(null)
      return
    }

    const ua = new UniversalAccount({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
      projectAppUuid: process.env.NEXT_PUBLIC_APP_ID!,
      smartAccountOptions: {
        useEIP7702: true,
        name: "UNIVERSAL",
        version: UNIVERSAL_ACCOUNT_VERSION,
        ownerAddress: userAddress,
      },
      tradeConfig: {
        slippageBps: 100,
        universalGas: false,
      },
    })

    setUniversalAccount(ua)
  }, [userAddress])

  const refreshDelegationStatus = useCallback(async () => {
    if (!universalAccount) return
    const deployments = await universalAccount.getEIP7702Deployments()
    const arb = deployments.find((d: any) => d.chainId === ARBITRUM_CHAIN_ID)
    setIsDelegated((arb as any)?.isDelegated ?? false)
  }, [universalAccount])

  useEffect(() => {
    if (!universalAccount || !userAddress) return

    const fetchAccountData = async () => {
      setLoading(true)
      try {
        const options = await universalAccount.getSmartAccountOptions()
        setAccountInfo({
          ownerAddress: userAddress,
          evmSmartAccount: options.smartAccountAddress || "",
          solanaSmartAccount: options.solanaSmartAccountAddress || "",
        })

        await refreshDelegationStatus()
        const assets = await universalAccount.getPrimaryAssets()
        setPrimaryAssets(assets)

      } catch (err) {
        console.error("Failed to fetch UA data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAccountData()
  }, [universalAccount, userAddress, refreshDelegationStatus])

  const refreshBalance = useCallback(async () => {
    if (!universalAccount) return
    try {
      const assets = await universalAccount.getPrimaryAssets()
      setPrimaryAssets(assets)
      const deployments = await universalAccount.getEIP7702Deployments()
      console.log("deployments", deployments)
    } catch (err) {
      console.error("Failed to refresh balance:", err)
    }
  }, [universalAccount])

  const getWaasConnector = useCallback(() => {
    if (!primaryWallet) throw new Error("No wallet connected")
    const { connector } = primaryWallet
    if (!connector || !isDynamicWaasConnector(connector)) {
      throw new Error("Connector is not a WaaS wallet connector")
    }
    return connector as unknown as DynamicWaasEVMConnector
  }, [primaryWallet])

  const signEip7702Auth = useCallback(
    async (contractAddress: string, chainId: number, nonce: number) => {
      const waasConnector = getWaasConnector()

      // Workaround: @dynamic-labs/waas-evm's signAuthorization() calls
      // getSigner() which returns a signer without .account, then crashes
      // destructuring signer.account.address. Patch getSigner to inject it.
      const origGetSigner = (waasConnector as any).getSigner.bind(waasConnector)
      ;(waasConnector as any).getSigner = async () => {
        const signer = await origGetSigner()
        if (signer && !signer.account) {
          signer.account = { address: userAddress as `0x${string}` }
        }
        return signer
      }

      try {
        return await waasConnector.signAuthorization({
          address: contractAddress as `0x${string}`,
          chainId,
          nonce,
        })
      } finally {
        ;(waasConnector as any).getSigner = origGetSigner
      }
    },
    [getWaasConnector, userAddress],
  )

  // Pre-delegate the EOA on Arbitrum via a Type-4 transaction.
  // We use chain-specific auth (ARBITRUM_CHAIN_ID) and Particle's recommended
  // nonce (auth.nonce + 1) rather than the on-chain transaction count.
  const ensureDelegated = useCallback(async () => {
    if (!universalAccount || !primaryWallet || !userAddress) {
      throw new Error("Universal Account or wallet not ready")
    }

    const deployments = await universalAccount.getEIP7702Deployments()
    const arb = deployments.find((d: any) => d.chainId === ARBITRUM_CHAIN_ID)
    if (!arb || (arb as any).isDelegated) {
      await refreshDelegationStatus()
      return
    }

    if (!isEthereumWallet(primaryWallet)) {
      throw new Error("Primary wallet is not an Ethereum wallet")
    }

    const [auth] = await universalAccount.getEIP7702Auth([ARBITRUM_CHAIN_ID])
    const authorization = await signEip7702Auth(
      auth.address,
      ARBITRUM_CHAIN_ID,
      auth.nonce + 1,
    )

    await primaryWallet.switchNetwork(ARBITRUM_CHAIN_ID)
    const walletClient = await primaryWallet.getWalletClient()
    await walletClient.sendTransaction({
      authorizationList: [authorization],
      to: userAddress as `0x${string}`,
      data: "0x" as `0x${string}`,
    })

    await refreshDelegationStatus()
  }, [
    universalAccount,
    primaryWallet,
    userAddress,
    signEip7702Auth,
    refreshDelegationStatus,
  ])

  const undelegateEOA = useCallback(async () => {
    if (!primaryWallet || !userAddress) {
      throw new Error("Wallet not ready")
    }

    if (!isEthereumWallet(primaryWallet)) {
      throw new Error("Primary wallet is not an Ethereum wallet")
    }

    await primaryWallet.switchNetwork(ARBITRUM_CHAIN_ID)

    const publicClient = await primaryWallet.getPublicClient()
    const nonce = await publicClient.getTransactionCount({
      address: userAddress as `0x${string}`,
    })

    const authorization = await signEip7702Auth(
      "0x0000000000000000000000000000000000000000",
      ARBITRUM_CHAIN_ID,
      nonce + 1,
    )

    const walletClient = await primaryWallet.getWalletClient()
    await walletClient.sendTransaction({
      authorizationList: [authorization],
      to: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      data: "0x" as `0x${string}`,
      gas: BigInt(100000),
      nonce,
    })

    await refreshDelegationStatus()
  }, [primaryWallet, userAddress, signEip7702Auth, refreshDelegationStatus])

  const signAndSend = useCallback(
    async (
      transaction: { rootHash: string; userOps?: any[] } & Record<
        string,
        any
      >,
    ) => {
      if (!universalAccount || !primaryWallet || !userAddress) {
        throw new Error("Universal Account or wallet not ready")
      }

      if (!isEthereumWallet(primaryWallet)) {
        throw new Error("Primary wallet is not an Ethereum wallet")
      }

      type EIP7702Authorization = { userOpHash: string; signature: string }
      const authorizations: EIP7702Authorization[] = []
      const nonceMap = new Map<number, string>()

      if (transaction.userOps) {
        for (const userOp of transaction.userOps) {
          if (userOp.eip7702Auth && !userOp.eip7702Delegated) {
            let signatureSerialized = nonceMap.get(userOp.eip7702Auth.nonce)

            if (!signatureSerialized) {
              const authorization = await signEip7702Auth(
                userOp.eip7702Auth.address,
                userOp.eip7702Auth.chainId ?? userOp.chainId,
                userOp.eip7702Auth.nonce,
              )

              const sig = Signature.from({
                r: (authorization as any).r,
                s: (authorization as any).s,
                v: (authorization as any).v,
              })
              signatureSerialized = sig.serialized
              nonceMap.set(userOp.eip7702Auth.nonce, signatureSerialized)
            }

            if (signatureSerialized) {
              authorizations.push({
                userOpHash: userOp.userOpHash,
                signature: signatureSerialized,
              })
            }
          }
        }
      }

      const walletClient = await primaryWallet.getWalletClient()
      const signature = await walletClient.signMessage({
        account: userAddress as `0x${string}`,
        message: { raw: transaction.rootHash as `0x${string}` },
      })

      const result = await universalAccount.sendTransaction(
        transaction as any,
        signature,
        authorizations.length > 0 ? authorizations : undefined,
      )

      return result
    },
    [universalAccount, primaryWallet, userAddress, signEip7702Auth],
  )

  const value = useMemo(
    () => ({
      universalAccount,
      accountInfo,
      primaryAssets,
      isDelegated,
      refreshBalance,
      ensureDelegated,
      undelegateEOA,
      signAndSend,
      loading,
    }),
    [
      universalAccount,
      accountInfo,
      primaryAssets,
      isDelegated,
      refreshBalance,
      ensureDelegated,
      undelegateEOA,
      signAndSend,
      loading,
    ],
  )

  return <UAContext.Provider value={value}>{children}</UAContext.Provider>
}
