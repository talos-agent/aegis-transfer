'use client'

import React, { createContext, useContext, useCallback } from 'react'

interface InvoiceRefreshContextType {
  triggerInvoiceRefresh: () => void
  registerRefreshCallback: (callback: () => void) => void
}

const InvoiceRefreshContext = createContext<InvoiceRefreshContextType | undefined>(undefined)

export function InvoiceRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshCallback, setRefreshCallback] = React.useState<(() => void) | null>(null)

  const triggerInvoiceRefresh = useCallback(() => {
    if (refreshCallback) {
      refreshCallback()
    }
  }, [refreshCallback])

  const registerRefreshCallback = useCallback((callback: () => void) => {
    setRefreshCallback(() => callback)
  }, [])

  return (
    <InvoiceRefreshContext.Provider value={{ triggerInvoiceRefresh, registerRefreshCallback }}>
      {children}
    </InvoiceRefreshContext.Provider>
  )
}

export function useInvoiceRefresh() {
  const context = useContext(InvoiceRefreshContext)
  if (context === undefined) {
    throw new Error('useInvoiceRefresh must be used within an InvoiceRefreshProvider')
  }
  return context
}
