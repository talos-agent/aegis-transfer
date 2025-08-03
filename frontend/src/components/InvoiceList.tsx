'use client'

import React, { useEffect, useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, Transfer, SUPPORTED_TOKENS, ERC20_ABI } from '@/lib/contract'

export function InvoiceList() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [invoices, setInvoices] = useState<(Transfer & { id: number; description: string; isInvoice: boolean })[]>([])
  const [loading, setLoading] = useState(true)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const { data: senderTransferIds } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getSenderTransfers',
    args: address ? [address] : undefined,
  })

  const { data: recipientTransferIds } = useReadContract({
    address: getSafeTransferAddress(chainId),
    abi: SAFE_TRANSFER_ABI,
    functionName: 'getRecipientTransfers',
    args: address ? [address] : undefined,
  })

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

      const uniqueIds = [...new Set(allTransferIds.map(id => Number(id)))]
      const invoiceData: (Transfer & { id: number; description: string; isInvoice: boolean })[] = []
      
      for (const id of uniqueIds) {
        try {
          const mockInvoice = {
            id,
            sender: '0x1234567890123456789012345678901234567890',
            recipient: '0x0987654321098765432109876543210987654321',
            tokenAddress: '0x0000000000000000000000000000000000000000',
            amount: BigInt('1000000000000000000'),
            timestamp: BigInt(Date.now() / 1000),
            expiryTime: BigInt(Date.now() / 1000 + 7 * 24 * 60 * 60),
            claimCode: '',
            claimed: false,
            cancelled: false,
            description: 'Sample invoice',
            isInvoice: true
          }
          
          invoiceData.push(mockInvoice)
        } catch (error) {
          console.error(`Error processing transfer ${id}:`, error)
        }
      }
      
      setInvoices(invoiceData)
      setLoading(false)
    }

    fetchInvoices()
  }, [senderTransferIds, recipientTransferIds, chainId])


  const handlePayInvoice = async (invoiceId: number, tokenAddress: string, amount: bigint) => {
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
          <div key={invoice.id} className="border border-border rounded-2xl p-6 bg-card shadow-lg backdrop-blur-sm">
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
          </div>
        )
      })}
    </div>
  )
}
