'use client'

import React, { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, SUPPORTED_TOKENS, TransferStatus, TRANSFER_STATUS_LABELS } from '@/lib/contract'
import { isSupportedNetwork } from '@/lib/network'
import { NetworkWarning } from './NetworkWarning'

export function ClaimTransfer() {
  const chainId = useChainId()
  const isNetworkSupported = isSupportedNetwork(chainId)
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
        <p className="text-muted-foreground mb-4">
          The funds have been transferred to your wallet.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-primary to-primary-700 text-primary-foreground rounded-xl hover:from-primary-600 hover:to-primary-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Claim Another Transfer
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Claim Transfer</h2>
      <NetworkWarning />
      
      <div className="space-y-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Transfer ID
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={transferId}
              onChange={(e) => setTransferId(e.target.value)}
              placeholder="Enter transfer ID"
              className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
            />
            <button
              onClick={handleLookupTransfer}
              className="px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-muted transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Lookup
            </button>
          </div>
        </div>

        {transfer && (
          <div className="border border-border rounded-2xl p-6 bg-card shadow-lg backdrop-blur-sm">
            <h3 className="font-semibold text-foreground mb-4">Transfer Details</h3>
            <div className="space-y-2 text-sm">
              <div>Amount: <span className="font-bold text-foreground">{formatAmount(transfer.amount, transfer.tokenAddress)}</span></div>
              <div>From: <span className="font-mono bg-secondary px-2 py-1 rounded-lg text-secondary-foreground">{transfer.sender.slice(0, 6)}...{transfer.sender.slice(-4)}</span></div>
              <div>Status: <span className="font-semibold text-foreground">{transferStatus !== undefined ? TRANSFER_STATUS_LABELS[transferStatus] : 'Loading...'}</span></div>
              <div className="text-muted-foreground">Expires: {new Date(Number(transfer.expiryTime) * 1000).toLocaleString()}</div>
              {transfer.claimCode !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                <div className="text-primary flex items-center gap-1">🔒 Requires claim code</div>
              )}
            </div>
          </div>
        )}
      </div>

      {transfer && transferStatus === TransferStatus.PENDING && (
        <form onSubmit={handleClaimTransfer} className="space-y-6">
          {transfer.claimCode !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Claim Code
              </label>
              <input
                type="text"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="Enter the claim code"
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isConfirming || !transferId || !isNetworkSupported}
            className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {!isNetworkSupported ? 'Switch to Supported Network' : isPending || isConfirming ? 'Claiming Transfer...' : 'Claim Transfer'}
          </button>
        </form>
      )}

      {transfer && transferStatus !== TransferStatus.PENDING && transferStatus !== undefined && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">
            This transfer cannot be claimed. Status: <span className="font-semibold text-foreground">{TRANSFER_STATUS_LABELS[transferStatus]}</span>
          </p>
        </div>
      )}
    </div>
  )
}
