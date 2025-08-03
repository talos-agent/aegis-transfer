'use client'

import React from 'react'
import { useAccount, useChainId } from 'wagmi'
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'

export function ConnectWallet() {
  const { isConnected } = useAccount()
  const { address } = useAppKitAccount()
  const { caipNetwork } = useAppKitNetwork()
  const { open } = useAppKit()
  const chainId = useChainId()

  if (isConnected && address) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <span className="text-xs text-gray-500">Connected</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
            {caipNetwork?.name || 'Unknown Network'}
          </div>
          
          <button
            onClick={() => open({ view: 'Networks' })}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg"
          >
            Switch Network
          </button>
          
          <button
            onClick={() => open({ view: 'Account' })}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg"
          >
            Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => open()}
        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        Connect Wallet
      </button>
      <p className="text-sm text-gray-500 text-center">
        Connect your wallet to start sending secure transfers
      </p>
    </div>
  )
}
