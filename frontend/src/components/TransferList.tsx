'use client'

import React, { useEffect, useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, Transfer, SUPPORTED_TOKENS, TransferStatus, TRANSFER_STATUS_LABELS } from '@/lib/contract'
import { getEnsNameForAddress, formatAddressWithEns } from '@/lib/ens'
import { isSupportedNetwork } from '@/lib/network'

export function TransferList() {
  const { address } = useAccount()
  const chainId = useChainId()
  const isNetworkSupported = isSupportedNetwork(chainId)
  const [transfers, setTransfers] = useState<(Transfer & { id: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [ensNames, setEnsNames] = useState<Record<string, string | null>>({})
  const [claimCodes, setClaimCodes] = useState<Record<number, string>>({})


  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: senderTransferData } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getSenderTransfers',
    args: address ? [address, BigInt(0), BigInt(100)] : undefined,
  })

  const { data: recipientTransferData } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getRecipientTransfers',
    args: address ? [address, BigInt(0), BigInt(100)] : undefined,
  })

  const senderTransferIds = senderTransferData?.[0]
  const recipientTransferIds = recipientTransferData?.[0]

  const allTransferIds = [
    ...(senderTransferIds || []),
    ...(recipientTransferIds || [])
  ]
  const uniqueIds = [...new Set(allTransferIds.map(id => Number(id)))]

  useEffect(() => {
    const fetchTransfers = async () => {
      if (uniqueIds.length === 0) {
        setLoading(false)
        return
      }

      const transferPromises = uniqueIds.map(async (id) => {
        try {
          const { readContract } = await import('viem/actions')
          const { createPublicClient, http } = await import('viem')
          const { mainnet, arbitrum } = await import('viem/chains')
          
          const chain = chainId === 42161 ? arbitrum : mainnet
          const client = createPublicClient({
            chain,
            transport: http()
          })
          
          const transferData = await readContract(client, {
            address: getSafeTransferAddress(chainId),
            abi: SAFE_TRANSFER_ABI,
            functionName: 'getTransfer',
            args: [BigInt(id)]
          }) as {
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
          
          return {
            id,
            sender: transferData.sender,
            recipient: transferData.recipient,
            tokenAddress: transferData.tokenAddress,
            amount: transferData.amount,
            timestamp: transferData.timestamp,
            expiryTime: transferData.expiryTime,
            claimCode: transferData.claimCode,
            claimed: transferData.claimed,
            cancelled: transferData.cancelled
          }
        } catch (error) {
          console.error(`Error fetching transfer ${id}:`, error)
          return null
        }
      })

      const transferResults = await Promise.all(transferPromises)
      const validTransfers = transferResults.filter((t): t is NonNullable<typeof t> => t !== null)
      
      setTransfers(validTransfers)
      
      const uniqueAddresses = [...new Set(validTransfers.flatMap(t => [t.sender, t.recipient]))]
      const ensPromises = uniqueAddresses.map(async (addr) => {
        const result = await getEnsNameForAddress(addr)
        return { address: addr, name: result.name }
      })
      
      const ensResults = await Promise.all(ensPromises)
      const ensMap = ensResults.reduce((acc, { address, name }) => {
        acc[address] = name
        return acc
      }, {} as Record<string, string | null>)
      
      setEnsNames(ensMap)
      setLoading(false)
    }

    fetchTransfers()
  }, [uniqueIds.length, chainId])

  const handleCancelTransfer = async (transferId: number) => {
    try {
      writeContract({
        address: getSafeTransferAddress(chainId),
        abi: SAFE_TRANSFER_ABI,
        functionName: 'cancelTransfer',
        args: [BigInt(transferId)],
      })
    } catch (error) {
      console.error('Error cancelling transfer:', error)
    }
  }

  const handleClaimTransfer = async (transferId: number) => {
    try {
      const claimCode = claimCodes[transferId] || ''
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

  const handleClaimCodeChange = (transferId: number, code: string) => {
    setClaimCodes((prev: Record<number, string>) => ({ ...prev, [transferId]: code }))
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
      case TransferStatus.PENDING: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case TransferStatus.CLAIMED: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case TransferStatus.CANCELLED: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case TransferStatus.EXPIRED: return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (isSuccess) {
    setTimeout(() => window.location.reload(), 2000)
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-xl font-semibold mb-4">
          Transfer Action Completed Successfully!
        </div>
        <p className="text-muted-foreground mb-4">
          The page will refresh automatically.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Loading transfers...</p>
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No transfers found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Transfers</h2>
      
      {transfers.map((transfer) => {
        const isSender = transfer.sender.toLowerCase() === address?.toLowerCase()
        
        return (
          <TransferCard 
            key={transfer.id} 
            transfer={transfer} 
            isSender={isSender}
            formatAmount={formatAmount}
            getStatusColor={getStatusColor}
            handleCancelTransfer={handleCancelTransfer}
            handleClaimTransfer={handleClaimTransfer}
            handleClaimCodeChange={handleClaimCodeChange}
            claimCodes={claimCodes}
            isPending={isPending}
            isConfirming={isConfirming}
            isNetworkSupported={isNetworkSupported}
            chainId={chainId}
            ensNames={ensNames}
          />
        )
      })}
    </div>
  )
}

function TransferCard({ 
  transfer, 
  isSender, 
  formatAmount, 
  getStatusColor, 
  handleCancelTransfer, 
  handleClaimTransfer, 
  handleClaimCodeChange, 
  claimCodes, 
  isPending, 
  isConfirming, 
  isNetworkSupported, 
  chainId,
  ensNames
}: {
  transfer: Transfer & { id: number }
  isSender: boolean
  formatAmount: (amount: bigint, tokenAddress: string) => string
  getStatusColor: (status: TransferStatus) => string
  handleCancelTransfer: (transferId: number) => void
  handleClaimTransfer: (transferId: number) => void
  handleClaimCodeChange: (transferId: number, code: string) => void
  claimCodes: Record<number, string>
  isPending: boolean
  isConfirming: boolean
  isNetworkSupported: boolean
  chainId: number
  ensNames: Record<string, string | null>
}){
  const { data: transferStatus } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getTransferStatus',
    args: [BigInt(transfer.id)],
  }) as { data: TransferStatus | undefined }

  const currentStatus = transferStatus ?? TransferStatus.PENDING
  const hasClaimCode = transfer.claimCode !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  const isExpired = Date.now() > Number(transfer.expiryTime) * 1000
  const canClaim = !isSender && currentStatus === TransferStatus.PENDING && !isExpired
  const canCancel = isSender && currentStatus === TransferStatus.PENDING && !isExpired

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">
              {isSender ? 'Sent to' : 'Received from'}:
            </span>
            <span className="text-sm text-gray-600 font-mono">
              {isSender 
                ? formatAddressWithEns(transfer.recipient, ensNames[transfer.recipient])
                : formatAddressWithEns(transfer.sender, ensNames[transfer.sender])
              }
            </span>
          </div>
          <div className="text-lg font-semibold">
            {formatAmount(transfer.amount, transfer.tokenAddress)}
          </div>
        </div>
        
        <div className="text-right">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
            {TRANSFER_STATUS_LABELS[currentStatus]}
          </span>
          <div className="text-xs text-gray-500 mt-1">
            ID: {transfer.id}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        <div>Created: {new Date(Number(transfer.timestamp) * 1000).toLocaleString()}</div>
        <div>Expires: {new Date(Number(transfer.expiryTime) * 1000).toLocaleString()}</div>
        {hasClaimCode && (
          <div className="text-primary flex items-center gap-1">🔒 Requires claim code</div>
        )}
      </div>

      {canClaim && (
        <div className="space-y-3">
          {hasClaimCode && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Claim Code
              </label>
              <input
                type="text"
                value={claimCodes[transfer.id] || ''}
                onChange={(e) => handleClaimCodeChange(transfer.id, e.target.value)}
                placeholder="Enter the claim code"
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground transition-all duration-200 shadow-sm"
                required
              />
            </div>
          )}
          <button
            onClick={() => handleClaimTransfer(transfer.id)}
            disabled={isPending || isConfirming || !isNetworkSupported || (hasClaimCode && !claimCodes[transfer.id])}
            className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {!isNetworkSupported ? 'Switch to Supported Network' : isPending || isConfirming ? 'Claiming Transfer...' : 'Claim Transfer'}
          </button>
        </div>
      )}

      {canCancel && (
        <button
          onClick={() => handleCancelTransfer(transfer.id)}
          disabled={isPending || isConfirming}
          className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
        >
          {isPending || isConfirming ? 'Cancelling...' : 'Cancel Transfer'}
        </button>
      )}

      {currentStatus !== TransferStatus.PENDING && (
        <div className="text-center py-2">
          <p className="text-muted-foreground text-sm">
            This transfer is {TRANSFER_STATUS_LABELS[currentStatus].toLowerCase()} and cannot be modified.
          </p>
        </div>
      )}
    </div>
  )
}
