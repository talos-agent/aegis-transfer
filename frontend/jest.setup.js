import '@testing-library/jest-dom'

const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: false,
  })),
  useWriteContract: jest.fn(() => ({
    writeContract: jest.fn(),
    data: null,
    isPending: false,
  })),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
  })),
  useReadContract: jest.fn(() => ({
    data: null,
  })),
  useChainId: jest.fn(() => 1),
}))

jest.mock('@reown/appkit/react', () => ({
  useAppKit: jest.fn(() => ({
    open: jest.fn(),
  })),
  useAppKitAccount: jest.fn(() => ({
    address: null,
  })),
  useAppKitNetwork: jest.fn(() => ({
    caipNetwork: null,
  })),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

global.fetch = jest.fn()
