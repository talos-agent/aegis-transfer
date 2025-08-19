'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther, parseUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, SUPPORTED_TOKENS, TokenInfo } from '@/lib/contract'
import { isSupportedNetwork } from '@/lib/network'
import { NetworkWarning } from './NetworkWarning'
import { resolveEnsOrAddress, type EnsResolutionResult } from '@/lib/ens'
import { useInvoiceRefresh } from '@/contexts/InvoiceRefreshContext'
import { AmountInput } from './AmountInput'

export function CreateInvoice() {
  const [payer, setPayer] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0])
  
  const [ensResolution, setEnsResolution] = useState<EnsResolutionResult | null>(null)
  const [isResolvingEns, setIsResolvingEns] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)

  const chainId = useChainId()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  const { triggerInvoiceRefresh } = useInvoiceRefresh()

  const safeTransferAddress = getSafeTransferAddress(chainId)
  const isNetworkSupported = isSupportedNetwork(chainId)

  const resolvePayerAddress = useCallback(async (input: string) => {
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

  const handlePayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPayer(value)
    
    if (ensResolution) {
      setEnsResolution(null)
      setResolvedAddress(null)
    }
  }

  const handlePayerBlur = () => {
    if (payer && !ensResolution) {
      resolvePayerAddress(payer)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalPayer = resolvedAddress || payer
    
    if (!finalPayer || !amount) return

    if (ensResolution && !ensResolution.isValid) {
      return
    }

    try {
      const expiryDuration = BigInt(parseInt(expiryDays) * 24 * 60 * 60)
      const amountBigInt = selectedToken.address === '0x0000000000000000000000000000000000000000' 
        ? parseEther(amount)
        : parseUnits(amount, selectedToken.decimals)
      
      writeContract({
        address: safeTransferAddress,
        abi: SAFE_TRANSFER_ABI,
        functionName: 'createInvoice',
        args: [
          finalPayer as `0x${string}`, 
          selectedToken.address as `0x${string}`, 
          amountBigInt, 
          expiryDuration, 
          description
        ],
      })
    } catch (error) {
      console.error('Error creating invoice:', error)
    }
  }

  useEffect(() => {
    if (isSuccess) {
      triggerInvoiceRefresh()
      setPayer('')
      setAmount('')
      setDescription('')
      setExpiryDays('7')
      setSelectedToken(SUPPORTED_TOKENS[0])
      setEnsResolution(null)
      setResolvedAddress(null)
    }
  }, [isSuccess, triggerInvoiceRefresh])

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-xl font-semibold mb-4">
          Invoice Created Successfully!
        </div>
        <p className="text-muted-foreground mb-4">
          Your invoice has been created and the list has been updated automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Create Invoice</h2>
      <NetworkWarning />
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Payer Address or ENS Name
          </label>
          <input
            type="text"
            value={payer}
            onChange={handlePayerChange}
            onBlur={handlePayerBlur}
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
            Address or ENS name of the person who should pay this invoice
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

        <AmountInput
          amount={amount}
          onAmountChange={setAmount}
          selectedToken={selectedToken}
          label="Amount"
          placeholder={selectedToken.symbol === 'ETH' ? '0.1' : '100'}
        />

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this invoice for?"
            rows={3}
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm resize-none"
          />
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

        <button
          type="submit"
          disabled={isPending || isConfirming || !payer || !amount || !isNetworkSupported}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary-700 text-primary-foreground rounded-xl hover:from-primary-600 hover:to-primary-800 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {!isNetworkSupported ? 'Switch to Supported Network' : isPending || isConfirming ? 'Creating Invoice...' : 'Create Invoice'}
        </button>
      </form>
    </div>
  )
}
