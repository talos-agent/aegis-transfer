'use client'

import React, { useState, useCallback } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, useChainId } from 'wagmi'
import { parseEther, parseUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, ERC20_ABI, SUPPORTED_TOKENS, TokenInfo } from '@/lib/contract'
import { isSupportedNetwork } from '@/lib/network'
import { NetworkWarning } from './NetworkWarning'
import { resolveEnsOrAddress, type EnsResolutionResult } from '@/lib/ens'

export function CreateTransfer() {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0])
  const [needsApproval, setNeedsApproval] = useState(false)
  
  const [ensResolution, setEnsResolution] = useState<EnsResolutionResult | null>(null)
  const [isResolvingEns, setIsResolvingEns] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)

  const { address } = useAccount()
  const chainId = useChainId()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const resolveRecipient = useCallback(async (input: string) => {
    if (!input.trim()) {
      setEnsResolution(null)
      setResolvedAddress(null)
      return
    }

    setIsResolvingEns(true)
    try {
      const result = await resolveEnsOrAddress(input)
      setEnsResolution(result)
      setResolvedAddress(result.address)
    } catch (error) {
      console.error('ENS resolution failed:', error)
      setEnsResolution({ address: null, isValid: false, isEns: false, error: 'Resolution failed' })
      setResolvedAddress(null)
    } finally {
      setIsResolvingEns(false)
    }
  }, [])

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRecipient(value)
    
    if (ensResolution) {
      setEnsResolution(null)
      setResolvedAddress(null)
    }
  }

  const handleRecipientBlur = () => {
    if (recipient && !ensResolution) {
      resolveRecipient(recipient)
    }
  }

  const safeTransferAddress = getSafeTransferAddress(chainId)
  const isNetworkSupported = isSupportedNetwork(chainId)

  const { data: allowance } = useReadContract({
    address: selectedToken.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, safeTransferAddress],
    query: {
      enabled: selectedToken.address !== '0x0000000000000000000000000000000000000000' && !!address
    }
  })

  const handleApprove = async () => {
    if (selectedToken.address === '0x0000000000000000000000000000000000000000') return

    try {
      const amountToApprove = parseUnits(amount, selectedToken.decimals)
      
      writeContract({
        address: selectedToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [safeTransferAddress, amountToApprove],
      })
    } catch (error) {
      console.error('Error approving token:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalRecipient = resolvedAddress || recipient
    
    if (!finalRecipient || !amount) return

    if (ensResolution && !ensResolution.isValid) {
      return
    }

    try {
      const expiryDuration = BigInt(parseInt(expiryDays) * 24 * 60 * 60)
      const isETH = selectedToken.address === '0x0000000000000000000000000000000000000000'
      
      if (isETH) {
        writeContract({
          address: safeTransferAddress,
          abi: SAFE_TRANSFER_ABI,
          functionName: 'createTransfer',
          args: [
            finalRecipient as `0x${string}`, 
            selectedToken.address as `0x${string}`, 
            BigInt(0), 
            expiryDuration, 
            claimCode
          ],
          value: parseEther(amount),
        })
      } else {
        const amountBigInt = parseUnits(amount, selectedToken.decimals)
        const currentAllowance = allowance as bigint || BigInt(0)
        
        if (currentAllowance < amountBigInt) {
          setNeedsApproval(true)
          return
        }
        
        writeContract({
          address: safeTransferAddress,
          abi: SAFE_TRANSFER_ABI,
          functionName: 'createTransfer',
          args: [
            finalRecipient as `0x${string}`, 
            selectedToken.address as `0x${string}`, 
            amountBigInt, 
            expiryDuration, 
            claimCode
          ],
        })
      }
    } catch (error) {
      console.error('Error creating transfer:', error)
    }
  }

  React.useEffect(() => {
    if (selectedToken.address !== '0x0000000000000000000000000000000000000000' && amount && allowance !== undefined) {
      const amountBigInt = parseUnits(amount, selectedToken.decimals)
      const currentAllowance = allowance as bigint || BigInt(0)
      setNeedsApproval(currentAllowance < amountBigInt)
    } else {
      setNeedsApproval(false)
    }
  }, [selectedToken, amount, allowance])

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-xl font-semibold mb-4">
          Transfer Created Successfully!
        </div>
        <p className="text-muted-foreground mb-4">
          Your transfer has been created and is now pending.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-primary to-primary-700 text-primary-foreground rounded-xl hover:from-primary-600 hover:to-primary-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Create Another Transfer
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Send Transfer</h2>
      <NetworkWarning />
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Recipient Address or ENS Name
          </label>
          <input
            type="text"
            value={recipient}
            onChange={handleRecipientChange}
            onBlur={handleRecipientBlur}
            placeholder="0x... or vitalik.eth"
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
            required
          />
          
          {isResolvingEns && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Resolving ENS name...
            </div>
          )}
          
          {ensResolution && !isResolvingEns && (
            <div className="mt-2 text-sm">
              {ensResolution.isValid ? (
                <div className="text-green-600 dark:text-green-400">
                  {ensResolution.isEns ? (
                    <>✓ Resolved to: <span className="font-mono">{ensResolution.address?.slice(0, 10)}...{ensResolution.address?.slice(-8)}</span></>
                  ) : (
                    <>✓ Valid address</>
                  )}
                </div>
              ) : (
                <div className="text-red-600 dark:text-red-400">
                  ✗ {ensResolution.error || 'Invalid address or ENS name'}
                </div>
              )}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mt-2">
            Address or ENS name of the person who will receive the transfer
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Token
          </label>
          <select
            value={selectedToken.address}
            onChange={(e) => {
              const token = SUPPORTED_TOKENS.find(t => t.address === e.target.value)
              if (token) setSelectedToken(token)
            }}
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
          >
            {SUPPORTED_TOKENS.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Amount ({selectedToken.symbol})
          </label>
          <input
            type="number"
            step={selectedToken.decimals === 18 ? "0.001" : "0.01"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={selectedToken.symbol === 'ETH' ? '0.1' : '100'}
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Claim Code (Optional)
          </label>
          <input
            type="text"
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value)}
            placeholder="Enter a secret code"
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            If provided, recipient will need this code to claim the transfer
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Expiry (Days)
          </label>
          <select
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
          >
            <option value="0">Never expires</option>
            <option value="1">1 Day</option>
            <option value="3">3 Days</option>
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>

        {needsApproval && selectedToken.address !== '0x0000000000000000000000000000000000000000' ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending || isConfirming || !recipient || !amount || !isNetworkSupported}
            className="w-full py-4 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {!isNetworkSupported ? 'Switch to Supported Network' : isPending || isConfirming ? 'Approving...' : `Approve ${selectedToken.symbol}`}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending || isConfirming || !recipient || !amount || !isNetworkSupported}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary-700 text-primary-foreground rounded-xl hover:from-primary-600 hover:to-primary-800 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {!isNetworkSupported ? 'Switch to Supported Network' : isPending || isConfirming ? 'Creating Transfer...' : 'Create Transfer'}
          </button>
        )}
      </form>
    </div>
  )
}
