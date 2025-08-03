'use client'

import React, { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, SUPPORTED_TOKENS, TransferStatus, TRANSFER_STATUS_LABELS } from '@/lib/contract'

export function ClaimTransfer() {
  const chainId = useChainId()
  const [transferId, setTransferId] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const [transfer, setTransfer] = useState<{
    sender: string
    recipient: string
    tokenAddress: string
    amount: bigint
    timestamp: bigint
    expiryTime: bigint
    claimCode: string
    claimed: boolean
    cancelled: boolean
  } | null>(null)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: transferData } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getTransfer',
    args: transferId ? [BigInt(transferId)] : undefined,
  })

  const { data: transferStatus } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getTransferStatus',
    args: transferId ? [BigInt(transferId)] : undefined,
  }) as { data: TransferStatus | undefined }

  const handleLookupTransfer = () => {
    if (transferData) {
      setTransfer(transferData)
    }
  }

  const formatAmount = (amount: bigint, tokenAddress: string) => {
    const token = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase())
    if (!token) return `${formatEther(amount)} ETH`
    
    if (token.address === '0x0000000000000000000000000000000000000000') {
      return `${formatEther(amount)} ${token.symbol}`
    }
    
    return `${formatUnits(amount, token.decimals)} ${token.symbol}`
  }

  const handleClaimTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!transferId) return

    try {
      writeContract({
        address: getSafeTransferAddress(chainId),
        abi: SAFE_TRANSFER_ABI,
        functionName: 'claimTransfer',
        args: [BigInt(transferId), claimCode],
      })
    } catch (error) {
      console.error('Error claiming transfer:', error)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-xl font-semibold mb-4">
          Transfer Claimed Successfully!
        </div>
        <p className="text-gray-600 mb-4">
          The funds have been transferred to your wallet.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Claim Another Transfer
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Claim Transfer</h2>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transfer ID
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={transferId}
              onChange={(e) => setTransferId(e.target.value)}
              placeholder="Enter transfer ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleLookupTransfer}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Lookup
            </button>
          </div>
        </div>

        {transfer && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium mb-2">Transfer Details</h3>
            <div className="space-y-1 text-sm">
              <div>Amount: <span className="font-semibold">{formatAmount(transfer.amount, transfer.tokenAddress)}</span></div>
              <div>From: <span className="font-mono">{transfer.sender.slice(0, 6)}...{transfer.sender.slice(-4)}</span></div>
              <div>Status: <span className="font-semibold">{transferStatus !== undefined ? TRANSFER_STATUS_LABELS[transferStatus] : 'Loading...'}</span></div>
              <div>Expires: {new Date(Number(transfer.expiryTime) * 1000).toLocaleString()}</div>
              {transfer.claimCode !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                <div className="text-blue-600">🔒 Requires claim code</div>
              )}
            </div>
          </div>
        )}
      </div>

      {transfer && transferStatus === TransferStatus.PENDING && (
        <form onSubmit={handleClaimTransfer} className="space-y-4">
          {transfer.claimCode !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claim Code
              </label>
              <input
                type="text"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="Enter the claim code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isConfirming || !transferId}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isPending || isConfirming ? 'Claiming Transfer...' : 'Claim Transfer'}
          </button>
        </form>
      )}

      {transfer && transferStatus !== TransferStatus.PENDING && transferStatus !== undefined && (
        <div className="text-center py-4">
          <p className="text-gray-600">
            This transfer cannot be claimed. Status: <span className="font-semibold">{TRANSFER_STATUS_LABELS[transferStatus]}</span>
          </p>
        </div>
      )}
    </div>
  )
}
