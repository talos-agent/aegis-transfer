import { getEnsAddress, getEnsName, normalize } from 'viem/ens'
import { isAddress } from 'viem'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

const ensCache = new Map<string, string | null>()
const reverseEnsCache = new Map<string, string | null>()

export interface EnsResolutionResult {
  address: string | null
  isValid: boolean
  isEns: boolean
  error?: string
}

export interface EnsNameResult {
  name: string | null
  error?: string
}

export async function resolveEnsOrAddress(input: string): Promise<EnsResolutionResult> {
  if (!input.trim()) {
    return { address: null, isValid: false, isEns: false }
  }

  const trimmedInput = input.trim()

  if (isAddress(trimmedInput)) {
    return { address: trimmedInput, isValid: true, isEns: false }
  }

  if (!trimmedInput.includes('.')) {
    return { address: null, isValid: false, isEns: false, error: 'Invalid address or ENS name' }
  }

  if (ensCache.has(trimmedInput)) {
    const cachedAddress = ensCache.get(trimmedInput) || null
    return {
      address: cachedAddress,
      isValid: cachedAddress !== null,
      isEns: true,
      error: cachedAddress === null ? 'ENS name not found' : undefined
    }
  }

  try {
    const normalizedName = normalize(trimmedInput)
    const resolvedAddress = await getEnsAddress(publicClient, { name: normalizedName })
    
    ensCache.set(trimmedInput, resolvedAddress)
    
    return {
      address: resolvedAddress,
      isValid: resolvedAddress !== null,
      isEns: true,
      error: resolvedAddress === null ? 'ENS name not found' : undefined
    }
  } catch (error) {
    console.error('ENS resolution error:', error)
    ensCache.set(trimmedInput, null)
    return {
      address: null,
      isValid: false,
      isEns: true,
      error: 'Failed to resolve ENS name'
    }
  }
}

export async function getEnsNameForAddress(address: string): Promise<EnsNameResult> {
  if (!isAddress(address)) {
    return { name: null, error: 'Invalid address' }
  }

  if (reverseEnsCache.has(address)) {
    return { name: reverseEnsCache.get(address) || null }
  }

  try {
    const ensName = await getEnsName(publicClient, { address: address as `0x${string}` })
    
    reverseEnsCache.set(address, ensName)
    
    return { name: ensName }
  } catch (error) {
    console.error('Reverse ENS resolution error:', error)
    reverseEnsCache.set(address, null)
    return { name: null, error: 'Failed to resolve ENS name' }
  }
}

export function formatAddressWithEns(address: string, ensName?: string | null): string {
  if (ensName) {
    return ensName
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function looksLikeEnsName(input: string): boolean {
  return input.includes('.') && !isAddress(input)
}
