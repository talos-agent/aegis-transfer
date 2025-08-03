import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

const metadata = {
  name: 'Aegis',
  description: 'Secure, cancellable cryptocurrency transfers',
  url: 'https://aegis-transfer.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const networks = [mainnet, arbitrum]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: networks as any,
  projectId,
  metadata,
  features: {
    analytics: true
  }
})

export const config = wagmiAdapter.wagmiConfig

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
