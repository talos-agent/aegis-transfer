'use client'

import React from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { mainnet, arbitrum } from 'wagmi/chains'

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const networks = [
    { id: mainnet.id, name: 'Ethereum', chain: mainnet },
    { id: arbitrum.id, name: 'Arbitrum', chain: arbitrum }
  ]

  const currentNetwork = networks.find(n => n.id === chainId) || networks[0]

  if (isConnected) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <span className="text-xs text-gray-500">Connected</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={chainId}
            onChange={(e) => switchChain({ chainId: parseInt(e.target.value) as 1 | 42161 })}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {networks.map((network) => (
              <option key={network.id} value={network.id}>
                {network.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => connect({ connector: injected() })}
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
