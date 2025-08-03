export const SAFE_TRANSFER_ABI = [
  {
    "type": "function",
    "name": "createTransfer",
    "inputs": [
      { "name": "_recipient", "type": "address" },
      { "name": "_tokenAddress", "type": "address" },
      { "name": "_amount", "type": "uint256" },
      { "name": "_expiryDuration", "type": "uint256" },
      { "name": "_claimCode", "type": "string" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "claimTransfer",
    "inputs": [
      {"name": "_transferId", "type": "uint256"},
      {"name": "_claimCode", "type": "string"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelTransfer",
    "inputs": [{"name": "_transferId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getTransfer",
    "inputs": [{"name": "_transferId", "type": "uint256"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {"name": "sender", "type": "address"},
          {"name": "recipient", "type": "address"},
          {"name": "tokenAddress", "type": "address"},
          {"name": "amount", "type": "uint256"},
          {"name": "timestamp", "type": "uint256"},
          {"name": "expiryTime", "type": "uint256"},
          {"name": "claimCode", "type": "bytes32"},
          {"name": "claimed", "type": "bool"},
          {"name": "cancelled", "type": "bool"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSenderTransfers",
    "inputs": [{"name": "_sender", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRecipientTransfers",
    "inputs": [{"name": "_recipient", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTransferStatus",
    "inputs": [{ "name": "_transferId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "TransferCreated",
    "inputs": [
      {"name": "transferId", "type": "uint256", "indexed": true},
      {"name": "sender", "type": "address", "indexed": true},
      {"name": "recipient", "type": "address", "indexed": true},
      {"name": "tokenAddress", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false},
      {"name": "expiryTime", "type": "uint256", "indexed": false},
      {"name": "hasClaimCode", "type": "bool", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "TransferClaimed",
    "inputs": [
      {"name": "transferId", "type": "uint256", "indexed": true},
      {"name": "recipient", "type": "address", "indexed": true},
      {"name": "tokenAddress", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "TransferCancelled",
    "inputs": [
      {"name": "transferId", "type": "uint256", "indexed": true},
      {"name": "sender", "type": "address", "indexed": true},
      {"name": "tokenAddress", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "function",
    "name": "createInvoice",
    "inputs": [
      {"name": "_payer", "type": "address"},
      {"name": "_tokenAddress", "type": "address"},
      {"name": "_amount", "type": "uint256"},
      {"name": "_expiryDuration", "type": "uint256"},
      {"name": "_description", "type": "string"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "payInvoice",
    "inputs": [{"name": "_invoiceId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getInvoiceDescription",
    "inputs": [{"name": "_invoiceId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getIsInvoice",
    "inputs": [{"name": "_transferId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "InvoiceCreated",
    "inputs": [
      {"name": "invoiceId", "type": "uint256", "indexed": true},
      {"name": "recipient", "type": "address", "indexed": true},
      {"name": "payer", "type": "address", "indexed": true},
      {"name": "tokenAddress", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false},
      {"name": "expiryTime", "type": "uint256", "indexed": false},
      {"name": "description", "type": "string", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "InvoicePaid",
    "inputs": [
      {"name": "invoiceId", "type": "uint256", "indexed": true},
      {"name": "payer", "type": "address", "indexed": true},
      {"name": "recipient", "type": "address", "indexed": true},
      {"name": "tokenAddress", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  }
] as const

const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  1: process.env.NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS as `0x${string}` || '0x',
  42161: process.env.NEXT_PUBLIC_ARBITRUM_CONTRACT_ADDRESS as `0x${string}` || '0x',
}

export const getSafeTransferAddress = (chainId: number): `0x${string}` => {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[1]
}

export const SAFE_TRANSFER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x'

export interface Transfer {
  sender: string
  recipient: string
  tokenAddress: string
  amount: bigint
  timestamp: bigint
  expiryTime: bigint
  claimCode: string
  claimed: boolean
  cancelled: boolean
}

export const ERC20_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view"
  }
] as const

export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
}

export enum TransferStatus {
  PENDING = 0,
  CLAIMED = 1,
  CANCELLED = 2,
  EXPIRED = 3,
  NOT_FOUND = 4
}

export const TRANSFER_STATUS_LABELS = {
  [TransferStatus.PENDING]: 'PENDING',
  [TransferStatus.CLAIMED]: 'CLAIMED',
  [TransferStatus.CANCELLED]: 'CANCELLED',
  [TransferStatus.EXPIRED]: 'EXPIRED',
  [TransferStatus.NOT_FOUND]: 'NOT_FOUND'
} as const

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18
  },
  {
    address: '0xA0b86a33E6441b8e776f89d2e4e8d8e8e8e8e8e8',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18
  }
]
