'use client'

import React, { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { SAFE_TRANSFER_ABI, SAFE_TRANSFER_ADDRESS } from '@/lib/contract'

export function CreateTransfer() {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!recipient || !amount) return

    try {
      const expiryDuration = BigInt(parseInt(expiryDays) * 24 * 60 * 60) // Convert days to seconds
      
      writeContract({
        address: SAFE_TRANSFER_ADDRESS,
        abi: SAFE_TRANSFER_ABI,
        functionName: 'createTransfer',
        args: [recipient as `0x${string}`, expiryDuration, claimCode],
        value: parseEther(amount),
      })
    } catch (error) {
      console.error('Error creating transfer:', error)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-xl font-semibold mb-4">
          Transfer Created Successfully!
        </div>
        <p className="text-gray-600 mb-4">
          Your transfer has been created and is now pending.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Another Transfer
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Transfer</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Code (Optional)
          </label>
          <input
            type="text"
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value)}
            placeholder="Enter a secret code"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            If provided, recipient will need this code to claim the transfer
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expiry (Days)
          </label>
          <select
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1">1 Day</option>
            <option value="3">3 Days</option>
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || !recipient || !amount}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isPending || isConfirming ? 'Creating Transfer...' : 'Create Transfer'}
        </button>
      </form>
    </div>
  )
}
