export const SUPPORTED_CHAIN_IDS = [1, 42161] as const

export const SUPPORTED_NETWORKS = {
  1: 'Ethereum Mainnet',
  42161: 'Arbitrum One'
} as const

export const isSupportedNetwork = (chainId: number | undefined): boolean => {
  if (!chainId) return false
  return SUPPORTED_CHAIN_IDS.includes(chainId as typeof SUPPORTED_CHAIN_IDS[number])
}

export const getSupportedNetworkName = (chainId: number): string => {
  return SUPPORTED_NETWORKS[chainId as keyof typeof SUPPORTED_NETWORKS] || 'Unknown Network'
}
