'use client'

import React, { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseEther, parseUnits, formatUnits } from 'viem'
import { SAFE_TRANSFER_ABI, SAFE_TRANSFER_ADDRESS, ERC20_ABI, SUPPORTED_TOKENS, TokenInfo } from '@/lib/contract'

export function CreateTransfer() {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0])
  const [needsApproval, setNeedsApproval] = useState(false)

  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const { data: allowance } = useReadContract({
    address: selectedToken.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, SAFE_TRANSFER_ADDRESS],
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
        args: [SAFE_TRANSFER_ADDRESS, amountToApprove],
      })
    } catch (error) {
      console.error('Error approving token:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!recipient || !amount) return

    try {
      const expiryDuration = BigInt(parseInt(expiryDays) * 24 * 60 * 60)
      const isETH = selectedToken.address === '0x0000000000000000000000000000000000000000'
      
      if (isETH) {
        writeContract({
          address: SAFE_TRANSFER_ADDRESS,
          abi: SAFE_TRANSFER_ABI,
          functionName: 'createTransfer',
          args: [
            recipient as `0x${string}`, 
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
          address: SAFE_TRANSFER_ADDRESS,
          abi: SAFE_TRANSFER_ABI,
          functionName: 'createTransfer',
          args: [
            recipient as `0x${string}`, 
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
            Token
          </label>
          <select
            value={selectedToken.address}
            onChange={(e) => {
              const token = SUPPORTED_TOKENS.find(t => t.address === e.target.value)
              if (token) setSelectedToken(token)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {SUPPORTED_TOKENS.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount ({selectedToken.symbol})
          </label>
          <input
            type="number"
            step={selectedToken.decimals === 18 ? "0.001" : "0.01"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={selectedToken.symbol === 'ETH' ? '0.1' : '100'}
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

        {needsApproval && selectedToken.address !== '0x0000000000000000000000000000000000000000' ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending || isConfirming || !recipient || !amount}
            className="w-full py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isPending || isConfirming ? 'Approving...' : `Approve ${selectedToken.symbol}`}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending || isConfirming || !recipient || !amount}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isPending || isConfirming ? 'Creating Transfer...' : 'Create Transfer'}
          </button>
        )}
      </form>
    </div>
  )
}
