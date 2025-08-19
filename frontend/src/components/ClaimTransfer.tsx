'use client'

import React, { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useReadContract } from 'wagmi'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress } from '@/lib/contract'
import { isSupportedNetwork } from '@/lib/network'
import { NetworkWarning } from './NetworkWarning'

export function ClaimTransfer() {
  const [transferId, setTransferId] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const [transfer, setTransfer] = useState<{
    sender: string;
    recipient: string;
    tokenAddress: string;
    amount: bigint;
    timestamp: bigint;
    expiryTime: bigint;
    claimCode: string;
    claimed: boolean;
    cancelled: boolean;
    hasClaimCode?: boolean;
    status?: string;
  } | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  useAccount()
  const chainId = useChainId()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const safeTransferAddress = getSafeTransferAddress(chainId)
  const isNetworkSupported = isSupportedNetwork(chainId)

  const { refetch: refetchTransfer } = useReadContract({
    address: safeTransferAddress,
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getTransfer',
    args: transferId ? [BigInt(transferId)] : undefined,
    query: {
      enabled: false,
    }
  })

  const handleLookup = async () => {
    if (!transferId) return
    
    setIsLookingUp(true)
    try {
      const result = await refetchTransfer()
      if (result.data) {
        const transferData = result.data as {
          sender: string;
          recipient: string;
          tokenAddress: string;
          amount: bigint;
          timestamp: bigint;
          expiryTime: bigint;
          claimCode: string;
          claimed: boolean;
          cancelled: boolean;
        }
        setTransfer({
          ...transferData,
          hasClaimCode: Boolean(transferData.claimCode && transferData.claimCode !== ''),
          status: transferData.claimed ? 'Claimed' : transferData.cancelled ? 'Cancelled' : 'Pending'
        })
      }
    } catch (error) {
      console.error('Error looking up transfer:', error)
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleClaim = async () => {
    if (!transferId) return

    try {
      writeContract({
        address: safeTransferAddress,
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
        <p className="text-muted-foreground mb-4">
          The transfer has been claimed and funds have been sent to your wallet.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Claim Transfer</h2>
      <NetworkWarning />
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Transfer ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={transferId}
              onChange={(e) => setTransferId(e.target.value)}
              placeholder="Enter transfer ID"
              className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
              required
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={!transferId || isLookingUp || !isNetworkSupported}
              className="px-6 py-3 bg-transparent border-2 border-primary text-primary rounded-xl hover:bg-primary hover:text-primary-foreground disabled:bg-muted disabled:border-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 glow-border"
            >
              {isLookingUp ? 'Looking up...' : 'Lookup'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter the transfer ID you received from the sender
          </p>
        </div>

        {transfer && (
          <div className="bg-card/80 border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Transfer Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From:</span>
                <span className="font-mono text-foreground">{transfer.sender?.slice(0, 10)}...{transfer.sender?.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="text-foreground">{transfer.amount?.toString()} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-foreground">{transfer.status}</span>
              </div>
            </div>

            {transfer.hasClaimCode && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Claim Code
                </label>
                <input
                  type="text"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  placeholder="Enter claim code"
                  className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This transfer requires a claim code from the sender
                </p>
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={isPending || isConfirming || !isNetworkSupported || (transfer.hasClaimCode && !claimCode)}
              className="w-full py-4 bg-transparent border-2 border-green-600 text-green-600 rounded-xl hover:bg-green-600 hover:text-white disabled:bg-muted disabled:border-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {!isNetworkSupported ? 'Switch to Supported Network' : isPending || isConfirming ? 'Claiming Transfer...' : 'Claim Transfer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
