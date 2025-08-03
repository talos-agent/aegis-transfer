export interface BridgeTransfer {
  id: string
  sourceChain: number
  destinationChain: number
  tokenAddress: string
  amount: bigint
  recipient: string
  status: BridgeTransferStatus
  txHash?: string
  estimatedTime?: number
}

export enum BridgeTransferStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface BridgeQuote {
  estimatedGas: bigint
  estimatedTime: number
  fee: bigint
  route: string[]
}

export interface BridgeProvider {
  name: string
  getSupportedChains(): number[]
  getQuote(
    sourceChain: number,
    destinationChain: number,
    tokenAddress: string,
    amount: bigint
  ): Promise<BridgeQuote>
  initiateBridge(
    sourceChain: number,
    destinationChain: number,
    tokenAddress: string,
    amount: bigint,
    recipient: string
  ): Promise<BridgeTransfer>
  getTransferStatus(transferId: string): Promise<BridgeTransferStatus>
}

export class LayerZeroBridge implements BridgeProvider {
  name = 'LayerZero'

  getSupportedChains(): number[] {
    return [1, 42161]
  }

  async getQuote(): Promise<BridgeQuote> {
    throw new Error('LayerZero integration not implemented yet')
  }

  async initiateBridge(): Promise<BridgeTransfer> {
    throw new Error('LayerZero integration not implemented yet')
  }

  async getTransferStatus(): Promise<BridgeTransferStatus> {
    throw new Error('LayerZero integration not implemented yet')
  }
}

export class AxelarBridge implements BridgeProvider {
  name = 'Axelar'

  getSupportedChains(): number[] {
    return [1, 42161]
  }

  async getQuote(): Promise<BridgeQuote> {
    throw new Error('Axelar integration not implemented yet')
  }

  async initiateBridge(): Promise<BridgeTransfer> {
    throw new Error('Axelar integration not implemented yet')
  }

  async getTransferStatus(): Promise<BridgeTransferStatus> {
    throw new Error('Axelar integration not implemented yet')
  }
}

export const bridgeProviders: BridgeProvider[] = [
  new LayerZeroBridge(),
  new AxelarBridge()
]

export const getBridgeProvider = (name: string): BridgeProvider | undefined => {
  return bridgeProviders.find(provider => provider.name === name)
}

export const getSupportedBridgeRoutes = (): Array<{sourceChain: number, destinationChain: number, providers: string[]}> => {
  const routes: Array<{sourceChain: number, destinationChain: number, providers: string[]}> = []
  
  const chains = [1, 42161]
  
  for (const sourceChain of chains) {
    for (const destinationChain of chains) {
      if (sourceChain !== destinationChain) {
        const providers = bridgeProviders
          .filter(provider => 
            provider.getSupportedChains().includes(sourceChain) &&
            provider.getSupportedChains().includes(destinationChain)
          )
          .map(provider => provider.name)
        
        if (providers.length > 0) {
          routes.push({ sourceChain, destinationChain, providers })
        }
      }
    }
  }
  
  return routes
}
