'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { SAFE_TRANSFER_ABI, getSafeTransferAddress, SUPPORTED_TOKENS } from '@/lib/contract'
import { ConnectWallet } from '@/components/ConnectWallet'
import { NetworkWarning } from '@/components/NetworkWarning'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function InvoicePage() {

  const params = useParams()
  const invoiceId = params.id as string
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [invoice, setInvoice] = useState<{
    sender: string;
    recipient: string;
    tokenAddress: string;
    amount: bigint;
    timestamp: bigint;
    expiryTime: bigint;
    claimCode: string;
    claimed: boolean;
    cancelled: boolean;
    description: string;
    isInvoice: boolean;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) return
      
      setLoading(true)
      setError(null)
      
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
          args: [BigInt(invoiceId)]
        }) as boolean
        
        if (!isInvoiceFlag) {
          setError('This is not a valid invoice ID')
          setLoading(false)
          return
        }
        
        const transferData = await readContract(client, {
          address: getSafeTransferAddress(chainId),
          abi: SAFE_TRANSFER_ABI,
          functionName: 'getTransfer',
          args: [BigInt(invoiceId)]
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
          args: [BigInt(invoiceId)]
        }) as string
        
        setInvoice({
          ...transferData,
          description: description || '',
          isInvoice: true
        })
      } catch (error) {
        console.error('Error fetching invoice:', error)
        setError('Failed to load invoice. Please check the invoice ID.')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [invoiceId, chainId])

  const handlePayInvoice = async () => {
    if (!invoice || !invoiceId) return

    try {
      const isETH = invoice.tokenAddress === '0x0000000000000000000000000000000000000000'
      
      if (isETH) {
        writeContract({
          address: getSafeTransferAddress(chainId),
          abi: SAFE_TRANSFER_ABI,
          functionName: 'payInvoice',
          args: [BigInt(invoiceId)],
          value: invoice.amount,
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

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-background via-background to-background dark:from-background dark:via-muted dark:to-background min-h-screen flex items-center justify-center p-4 animate-fade-in particle-bg">
        <div className="bg-card border-2 border-primary/30 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center backdrop-blur-sm animate-slide-up relative glow-border">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="bg-gradient-to-br from-background via-background to-background dark:from-background dark:via-muted dark:to-background min-h-screen flex items-center justify-center p-4 animate-fade-in particle-bg">
        <div className="bg-card border-2 border-primary/30 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center backdrop-blur-sm animate-slide-up relative glow-border">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="text-red-600 text-xl font-semibold mb-4">
            Invoice Not Found
          </div>
          <p className="text-muted-foreground mb-4">
            {error || 'The invoice you are looking for does not exist or has been removed.'}
          </p>
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold"
          >
            Go to Aegis
          </a>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="bg-gradient-to-br from-background via-background to-background dark:from-background dark:via-muted dark:to-background min-h-screen flex items-center justify-center p-4 animate-fade-in particle-bg">
        <div className="bg-card border-2 border-primary/30 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center backdrop-blur-sm animate-slide-up relative glow-border">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="text-green-600 text-xl font-semibold mb-4">
            Invoice Paid Successfully!
          </div>
          <p className="text-muted-foreground mb-4">
            The invoice has been paid and funds have been sent to the recipient.
          </p>
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold"
          >
            Go to Aegis
          </a>
        </div>
      </div>
    )
  }

  const isPayer = address && invoice.sender.toLowerCase() === address.toLowerCase()
  const canPay = isPayer && !invoice.claimed && !invoice.cancelled

  return (
    <div className="bg-gradient-to-br from-background via-background to-background dark:from-background dark:via-muted dark:to-background min-h-screen p-4 animate-fade-in particle-bg">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-3 drop-shadow-lg" style={{
            textShadow: '0 0 15px rgba(0, 191, 255, 0.5), 0 0 30px rgba(0, 191, 255, 0.3)',
            WebkitTextStroke: '1px rgba(0, 191, 255, 0.3)'
          }}>
            AEGIS
          </h1>
          <p className="text-muted-foreground text-lg">Invoice Payment</p>
        </header>

        <div className="bg-card/80 border-2 border-primary/30 rounded-3xl shadow-2xl p-8 backdrop-blur-sm animate-slide-up glow-border">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">Invoice Details</h2>
            <div className="text-sm text-muted-foreground">
              Invoice ID: {invoiceId}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-secondary/50 rounded-xl p-6">
              <div className="text-3xl font-bold text-center text-foreground mb-4">
                {formatAmount(invoice.amount, invoice.tokenAddress)}
              </div>
              
              {invoice.description && (
                <div className="text-center text-muted-foreground mb-4">
                  &ldquo;{invoice.description}&rdquo;
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-mono text-foreground">
                    {invoice.recipient.slice(0, 6)}...{invoice.recipient.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-mono text-foreground">
                    {invoice.sender.slice(0, 6)}...{invoice.sender.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    invoice.claimed 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {invoice.claimed ? 'PAID' : 'UNPAID'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="text-foreground">
                    {new Date(Number(invoice.timestamp) * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="text-foreground">
                    {new Date(Number(invoice.expiryTime) * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <NetworkWarning />

            {!isConnected ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Connect your wallet to pay this invoice
                </p>
                <ConnectWallet />
              </div>
            ) : canPay ? (
              <button
                onClick={handlePayInvoice}
                disabled={isPending || isConfirming}
                className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {isPending || isConfirming ? 'Paying Invoice...' : 'Pay Invoice'}
              </button>
            ) : invoice.claimed ? (
              <div className="text-center py-4 text-green-600 font-semibold">
                This invoice has already been paid
              </div>
            ) : !isPayer ? (
              <div className="text-center py-4 text-muted-foreground">
                This invoice is not addressed to your wallet
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                This invoice cannot be paid
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
