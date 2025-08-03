'use client'

import React from 'react'
import { useAccount } from 'wagmi'
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'

export function ConnectWallet() {
  const { isConnected } = useAccount()
  const { address } = useAppKitAccount()
  const { caipNetwork } = useAppKitNetwork()
  const { open } = useAppKit()

  if (isConnected && address) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-card border border-border rounded-2xl shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 text-sm border border-border rounded-lg bg-input text-foreground">
            {caipNetwork?.name || 'Unknown Network'}
          </div>
          
          <button
            onClick={() => open({ view: 'Networks' })}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
          >
            Switch Network
          </button>
          
          <button
            onClick={() => open({ view: 'Account' })}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
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
        className="px-8 py-4 bg-transparent border-2 border-primary text-primary rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 glow-border"
        style={{
          boxShadow: '0 0 20px rgba(0, 191, 255, 0.3), inset 0 0 20px rgba(0, 191, 255, 0.1)'
        }}
      >
        CONNECT WALLET
      </button>
      <p className="text-sm text-muted-foreground text-center">
        Connect your wallet to start sending secure transfers
      </p>
    </div>
  )
}
