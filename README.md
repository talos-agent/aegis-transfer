# Aegis

A decentralized application that enables users to send transferable funds that can be cancelled if not accepted within a timeframe, preventing loss of funds due to incorrect addresses.

> **Note**: This implementation provides a secure alternative to traditional irreversible cryptocurrency transfers.

## Features

- **Cancellable Transfers**: Send funds that can be cancelled if sent to wrong address
- **Time-based Expiry**: Transfers expire after a set timeframe if not claimed
- **Claim Codes**: Optional codes for recipients to use when claiming transfers
- **Pending Transfer Management**: View and manage pending incoming/outgoing transfers

## Architecture

- **Smart Contracts**: Foundry-based Solidity contracts for transfer logic
- **Frontend**: React-based web interface for user interactions

## Getting Started

### Smart Contracts

```bash
cd contracts
forge install
forge build
forge test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
├── contracts/          # Foundry smart contracts
│   ├── src/
│   ├── test/
│   └── foundry.toml
├── frontend/           # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```
