'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { InvoiceRefreshProvider } from '@/contexts/InvoiceRefreshContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <InvoiceRefreshProvider>
            {children}
          </InvoiceRefreshProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
