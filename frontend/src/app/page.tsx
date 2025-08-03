'use client'

import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectWallet } from '@/components/ConnectWallet'
import { CreateTransfer } from '@/components/CreateTransfer'
import { TransferList } from '@/components/TransferList'
import { ClaimTransfer } from '@/components/ClaimTransfer'
import { CreateInvoice } from '@/components/CreateInvoice'
import { InvoiceList } from '@/components/InvoiceList'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Home() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'claim' | 'invoice'>('send')

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-primary-100 dark:from-background dark:via-muted dark:to-background flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-card border border-border rounded-3xl shadow-2xl p-8 max-w-md w-full text-center backdrop-blur-sm animate-slide-up relative">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-4">
              Aegis
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Send cryptocurrency transfers that can be cancelled if sent to the wrong address
            </p>
          </div>
          <ConnectWallet />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-primary-100 dark:from-background dark:via-muted dark:to-background p-4 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-3">
            Aegis
          </h1>
          <p className="text-muted-foreground text-xl">Secure, cancellable cryptocurrency transfers</p>
          <div className="mt-6">
            <ConnectWallet />
          </div>
        </header>

        <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm animate-slide-up">
          <div className="border-b border-border bg-secondary/50">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('send')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 ${
                  activeTab === 'send'
                    ? 'text-primary bg-background border-b-2 border-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                Send Transfer
              </button>
              <button
                onClick={() => setActiveTab('receive')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 ${
                  activeTab === 'receive'
                    ? 'text-primary bg-background border-b-2 border-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                My Transfers
              </button>
              <button
                onClick={() => setActiveTab('claim')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 ${
                  activeTab === 'claim'
                    ? 'text-primary bg-background border-b-2 border-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                Claim Transfer
              </button>
              <button
                onClick={() => setActiveTab('invoice')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-200 ${
                  activeTab === 'invoice'
                    ? 'text-primary bg-background border-b-2 border-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                Invoices
              </button>
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'send' && <CreateTransfer />}
            {activeTab === 'receive' && <TransferList />}
            {activeTab === 'claim' && <ClaimTransfer />}
            {activeTab === 'invoice' && (
              <div className="space-y-8">
                <CreateInvoice />
                <div className="border-t border-border pt-8">
                  <InvoiceList />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
