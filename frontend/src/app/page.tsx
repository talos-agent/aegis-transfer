'use client'

import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectWallet } from '@/components/ConnectWallet'
import { CreateTransfer } from '@/components/CreateTransfer'
import { TransferList } from '@/components/TransferList'
import { ClaimTransfer } from '@/components/ClaimTransfer'

export default function Home() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'claim'>('send')

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Aegis</h1>
          <p className="text-gray-600 mb-8">
            Send cryptocurrency transfers that can be cancelled if sent to the wrong address
          </p>
          <ConnectWallet />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Aegis</h1>
          <p className="text-gray-600">Secure, cancellable cryptocurrency transfers</p>
          <div className="mt-4">
            <ConnectWallet />
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('send')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'send'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Send Transfer
              </button>
              <button
                onClick={() => setActiveTab('receive')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'receive'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Transfers
              </button>
              <button
                onClick={() => setActiveTab('claim')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'claim'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Claim Transfer
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'send' && <CreateTransfer />}
            {activeTab === 'receive' && <TransferList />}
            {activeTab === 'claim' && <ClaimTransfer />}
          </div>
        </div>
      </div>
    </div>
  )
}
