'use client'

import React, { useEffect, useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { SAFE_TRANSFER_ABI, SAFE_TRANSFER_ADDRESS, Transfer, SUPPORTED_TOKENS, TransferStatus, TRANSFER_STATUS_LABELS } from '@/lib/contract'

export function TransferList() {
  const { address } = useAccount()
  const [transfers, setTransfers] = useState<(Transfer & { id: number })[]>([])
  const [loading, setLoading] = useState(true)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const { data: senderTransferIds } = useReadContract({
    address: SAFE_TRANSFER_ADDRESS,
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getSenderTransfers',
    args: address ? [address] : undefined,
  })

  const { data: recipientTransferIds } = useReadContract({
    address: SAFE_TRANSFER_ADDRESS,
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getRecipientTransfers',
    args: address ? [address] : undefined,
  })

  useEffect(() => {
    const fetchTransfers = async () => {
      if (!senderTransferIds && !recipientTransferIds) return

      const allTransferIds = [
        ...(senderTransferIds || []),
        ...(recipientTransferIds || [])
      ]

      const uniqueIds = [...new Set(allTransferIds.map(id => Number(id)))]
      
      const transferPromises = uniqueIds.map(async (id) => {
        try {
          const transfer = await fetch(`/api/transfer/${id}`).then(res => res.json())
          return { ...transfer, id }
        } catch (error) {
          console.error(`Error fetching transfer ${id}:`, error)
          return null
        }
      })

      const transferResults = await Promise.all(transferPromises)
      const validTransfers = transferResults.filter(Boolean)
      
      setTransfers(validTransfers)
      setLoading(false)
    }

    fetchTransfers()
  }, [senderTransferIds, recipientTransferIds])

  const handleCancelTransfer = async (transferId: number) => {
    try {
      writeContract({
        address: SAFE_TRANSFER_ADDRESS,
        abi: SAFE_TRANSFER_ABI,
        functionName: 'cancelTransfer',
        args: [BigInt(transferId)],
      })
    } catch (error) {
      console.error('Error cancelling transfer:', error)
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

  const getStatusColor = (status: TransferStatus) => {
    switch (status) {
      case TransferStatus.PENDING: return 'bg-yellow-100 text-yellow-800'
      case TransferStatus.CLAIMED: return 'bg-green-100 text-green-800'
      case TransferStatus.CANCELLED: return 'bg-red-100 text-red-800'
      case TransferStatus.EXPIRED: return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading transfers...</p>
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No transfers found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Transfers</h2>
      
      {transfers.map((transfer) => {
        const isSender = transfer.sender.toLowerCase() === address?.toLowerCase()
        
        return (
          <div key={transfer.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {isSender ? 'Sent to' : 'Received from'}:
                  </span>
                  <span className="text-sm text-gray-600 font-mono">
                    {isSender 
                      ? `${transfer.recipient.slice(0, 6)}...${transfer.recipient.slice(-4)}`
                      : `${transfer.sender.slice(0, 6)}...${transfer.sender.slice(-4)}`
                    }
                  </span>
                </div>
                <div className="text-lg font-semibold">
                  {formatAmount(transfer.amount, transfer.tokenAddress)}
                </div>
              </div>
              
              <div className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(TransferStatus.PENDING)}`}>
                  {TRANSFER_STATUS_LABELS[TransferStatus.PENDING]}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  ID: {transfer.id}
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              <div>Created: {new Date(Number(transfer.timestamp) * 1000).toLocaleString()}</div>
              <div>Expires: {new Date(Number(transfer.expiryTime) * 1000).toLocaleString()}</div>
              {transfer.claimCode !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                <div className="text-blue-600">🔒 Requires claim code</div>
              )}
            </div>

            {isSender && !transfer.claimed && !transfer.cancelled && (
              <button
                onClick={() => handleCancelTransfer(transfer.id)}
                disabled={isPending || isConfirming}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isPending || isConfirming ? 'Cancelling...' : 'Cancel Transfer'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
