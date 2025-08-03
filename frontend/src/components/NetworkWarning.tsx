'use client'

import React from 'react'
import { useChainId } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { isSupportedNetwork, SUPPORTED_NETWORKS } from '@/lib/network'

export function NetworkWarning() {
  const chainId = useChainId()
  const { open } = useAppKit()

  if (isSupportedNetwork(chainId)) {
    return null
  }

  const supportedNetworkNames = Object.values(SUPPORTED_NETWORKS).join(', ')

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="text-red-500 text-xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-red-800 font-semibold mb-1">Unsupported Network</h3>
          <p className="text-red-700 text-sm mb-3">
            You&apos;re connected to an unsupported network. Aegis only supports {supportedNetworkNames}.
            Please switch to a supported network to create or claim transfers.
          </p>
          <button
            onClick={() => open({ view: 'Networks' })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Switch Network
          </button>
        </div>
      </div>
    </div>
  )
}
