'use client'

import React, { useEffect, useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, Transfer, SUPPORTED_TOKENS } from '@/lib/contract'
import { useInvoiceRefresh } from '@/contexts/InvoiceRefreshContext'

export function InvoiceList() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [invoices, setInvoices] = useState<(Transfer & { id: string; description: string; isInvoice: boolean })[]>([])
  const [loading, setLoading] = useState(true)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const { registerRefreshCallback } = useInvoiceRefresh()

  const { data: senderTransferData, refetch: refetchSenderTransfers } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getSenderTransfers',
    args: address ? [address, BigInt(0), BigInt(100)] : undefined,
  })

  const { data: recipientTransferData, refetch: refetchRecipientTransfers } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getRecipientTransfers',
    args: address ? [address, BigInt(0), BigInt(100)] : undefined,
  })

  const senderTransferIds = senderTransferData?.[0]
  const recipientTransferIds = recipientTransferData?.[0]

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!senderTransferIds && !recipientTransferIds) {
        setLoading(false)
        return
      }

      const allTransferIds = [
        ...(senderTransferIds || []),
        ...(recipientTransferIds || [])
      ]

      const uniqueIds = [...new Set(allTransferIds.map(id => id.toString()))]
      const invoiceData: (Transfer & { id: string; description: string; isInvoice: boolean })[] = []
      
      for (const id of uniqueIds) {
        try {
          const { readContract } = await import('viem/actions')
          const { createPublicClient, http } = await import('viem')
          const { mainnet, arbitrum } = await import('viem/chains')
          
          const chain = chainId === 42161 ? arbitrum : mainnet
          const client = createPublicClient({
            chain,
            transport: http()
          })
          
          const isInvoiceFlag = await readContract(client, {
            address: getSafeTransferAddress(chainId),
            abi: SAFE_TRANSFER_ABI,
            functionName: 'getIsInvoice',
            args: [BigInt(id)]
          }) as boolean
          
          if (!isInvoiceFlag) continue
          
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
          
          const description = await readContract(client, {
            address: getSafeTransferAddress(chainId),
            abi: SAFE_TRANSFER_ABI,
            functionName: 'getInvoiceDescription',
            args: [BigInt(id)]
          }) as string
          
          const invoice = {
            id,
            sender: transferData.sender,
            recipient: transferData.recipient,
            tokenAddress: transferData.tokenAddress,
            amount: transferData.amount,
            timestamp: transferData.timestamp,
            expiryTime: transferData.expiryTime,
            claimCode: transferData.claimCode,
            claimed: transferData.claimed,
            cancelled: transferData.cancelled,
            description: description || '',
            isInvoice: true
          }
          
          if (transferData.cancelled) continue
          
          invoiceData.push(invoice)
        } catch (error) {
          console.error(`Error processing transfer ${id}:`, error)
        }
      }
      
      setInvoices(invoiceData)
      setLoading(false)
    }

    fetchInvoices()
  }, [senderTransferIds, recipientTransferIds, chainId])

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      writeContract({
        address: getSafeTransferAddress(chainId),
        abi: SAFE_TRANSFER_ABI,
        functionName: 'cancelInvoice',
        args: [BigInt(invoiceId)],
      })
    } catch (error) {
      console.error('Error cancelling invoice:', error)
    }
  }


  const handlePayInvoice = async (invoiceId: string, tokenAddress: string, amount: bigint) => {
    try {
      const isETH = tokenAddress === '0x0000000000000000000000000000000000000000'
      
      if (isETH) {
        writeContract({
          address: getSafeTransferAddress(chainId),
          abi: SAFE_TRANSFER_ABI,
          functionName: 'payInvoice',
          args: [BigInt(invoiceId)],
          value: amount,
        })
      } else {
        writeContract({
          address: getSafeTransferAddress(chainId),
          abi: SAFE_TRANSFER_ABI,
          functionName: 'payInvoice',
          args: [BigInt(invoiceId)],
        })
      }
    } catch (error) {
      console.error('Error paying invoice:', error)
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

  const getStatusColor = (claimed: boolean) => {
    return claimed 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  }

  useEffect(() => {
    if (isSuccess) {
      refetchSenderTransfers()
      refetchRecipientTransfers()
    }
  }, [isSuccess, refetchSenderTransfers, refetchRecipientTransfers])

  useEffect(() => {
    const refreshInvoices = () => {
      refetchSenderTransfers()
      refetchRecipientTransfers()
    }
    registerRefreshCallback(refreshInvoices)
  }, [registerRefreshCallback, refetchSenderTransfers, refetchRecipientTransfers])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Loading invoices...</p>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No invoices found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground mb-6">My Invoices</h2>
      
      {invoices.map((invoice) => {
        const isRecipient = invoice.recipient.toLowerCase() === address?.toLowerCase()
        const isPayer = invoice.sender.toLowerCase() === address?.toLowerCase()
        
        return (
          <div key={invoice.id} className="border border-border rounded-2xl p-6 bg-card/80 shadow-lg backdrop-blur-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-foreground">
                    {isRecipient ? 'Invoice from you to' : 'Invoice to you from'}:
                  </span>
                  <span className="text-sm text-muted-foreground font-mono bg-secondary px-2 py-1 rounded-lg">
                    {isRecipient 
                      ? `${invoice.sender.slice(0, 6)}...${invoice.sender.slice(-4)}`
                      : `${invoice.recipient.slice(0, 6)}...${invoice.recipient.slice(-4)}`
                    }
                  </span>
                </div>
                <div className="text-xl font-bold text-foreground mb-2">
                  {formatAmount(invoice.amount, invoice.tokenAddress)}
                </div>
                {invoice.description && (
                  <div className="text-sm text-muted-foreground mb-2">
                    &ldquo;{invoice.description}&rdquo;
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.claimed)}`}>
                  {invoice.claimed ? 'PAID' : 'UNPAID'}
                </span>
                <div className="text-xs text-muted-foreground mt-1">
                  ID: {invoice.id}
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              <div>Created: {new Date(Number(invoice.timestamp) * 1000).toLocaleString()}</div>
              <div>Expires: {new Date(Number(invoice.expiryTime) * 1000).toLocaleString()}</div>
            </div>

            {isPayer && !invoice.claimed && !invoice.cancelled && (
              <div className="flex gap-2">
                <button
                  onClick={() => handlePayInvoice(invoice.id, invoice.tokenAddress, invoice.amount)}
                  disabled={isPending || isConfirming}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  {isPending || isConfirming ? 'Paying...' : 'Pay Invoice'}
                </button>
              </div>
            )}
            
            {isRecipient && !invoice.claimed && !invoice.cancelled && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleCancelInvoice(invoice.id)}
                  disabled={isPending || isConfirming}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  {isPending || isConfirming ? 'Cancelling...' : 'Cancel Invoice'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
