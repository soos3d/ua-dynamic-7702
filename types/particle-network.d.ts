declare module "@particle-network/universal-account-sdk" {
  export class UniversalAccount {
    constructor(config: {
      projectId: string
      projectClientKey: string
      projectAppUuid: string
      ownerAddress?: string
      smartAccountOptions?: {
        useEIP7702?: boolean
        name: string
        version: string
        ownerAddress: string
        smartAccountAddress?: string
        solanaSmartAccountAddress?: string
      }
      tradeConfig?: {
        slippageBps?: number
        universalGas?: boolean
        usePrimaryTokens?: string[]
      }
    })
    getSmartAccountOptions(): Promise<{
      smartAccountAddress: string
      solanaSmartAccountAddress: string
    }>
    getEIP7702Deployments(): Promise<
      Array<{ chainId: number; isDelegated: boolean; address: string }>
    >
    getEIP7702Auth(
      chainIds: number[],
    ): Promise<Array<{ address: string; nonce: number }>>
    getPrimaryAssets(): Promise<IAssetsResponse>
    createConvertTransaction(params: {
      expectToken: { type: string; amount: string }
      chainId: number
    }): Promise<any>
    sendTransaction(
      transaction: any,
      signature: string,
      authorizations?: Array<{ userOpHash: string; signature: string }>,
    ): Promise<{ transactionId: string }>
    getTransaction(transactionId: string): Promise<any>
    getTransactions(page?: number, limit?: number): Promise<any>
  }

  export const UNIVERSAL_ACCOUNT_VERSION: string

  export interface IAssetsResponse {
    totalAmountInUSD: number
    assets: Array<{
      tokenType: string
      amount: number
      amountInUSD: number
      chainAggregation: Array<{
        amount: number
        amountInUSD: number
        token: { chainId: number }
      }>
    }>
  }

  export const CHAIN_ID: {
    SOLANA_MAINNET: number
    ETHEREUM_MAINNET: number
    ARBITRUM_MAINNET_ONE: number
    [key: string]: number
  }

  export const SUPPORTED_TOKEN_TYPE: {
    USDC: string
    USDT: string
    ETH: string
    SOL: string
    [key: string]: string
  }
}
