'use client'

import React, { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi'
import { parseEther, parseUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, SUPPORTED_TOKENS, TokenInfo } from '@/lib/contract'
import { isSupportedNetwork } from '@/lib/network'
import { NetworkWarning } from './NetworkWarning'

export function CreateInvoice() {
  const [payer, setPayer] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0])

  const chainId = useChainId()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const safeTransferAddress = getSafeTransferAddress(chainId)
  const isNetworkSupported = isSupportedNetwork(chainId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!payer || !amount) return

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
          payer as `0x${string}`, 
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

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-xl font-semibold mb-4">
          Invoice Created Successfully!
        </div>
        <p className="text-muted-foreground mb-4">
          Your invoice has been created and the payer can now pay it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-primary to-primary-700 text-primary-foreground rounded-xl hover:from-primary-600 hover:to-primary-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Create Another Invoice
        </button>
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
            Payer Address
          </label>
          <input
            type="text"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
            required
          />
          <p className="text-xs text-muted-foreground mt-2">
            Address of the person who should pay this invoice
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
