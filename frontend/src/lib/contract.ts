export const SAFE_TRANSFER_ABI = [
  {
    "type": "function",
    "name": "createTransfer",
    "inputs": [
      {"name": "_recipient", "type": "address"},
      {"name": "_expiryDuration", "type": "uint256"},
      {"name": "_claimCode", "type": "string"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
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
    "inputs": [{"name": "_transferId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "TransferCreated",
    "inputs": [
      {"name": "transferId", "type": "uint256", "indexed": true},
      {"name": "sender", "type": "address", "indexed": true},
      {"name": "recipient", "type": "address", "indexed": true},
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
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "TransferCancelled",
    "inputs": [
      {"name": "transferId", "type": "uint256", "indexed": true},
      {"name": "sender", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  }
] as const

export const SAFE_TRANSFER_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x'

export interface Transfer {
  sender: string
  recipient: string
  amount: bigint
  timestamp: bigint
  expiryTime: bigint
  claimCode: string
  claimed: boolean
  cancelled: boolean
}
