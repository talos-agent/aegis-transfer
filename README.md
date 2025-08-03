# Aegis Transfer

[![Solidity](https://img.shields.io/badge/Solidity-^0.8.13-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-toolkit-000000?style=flat-square)](https://getfoundry.sh/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-green?style=flat-square&logo=github)](https://talos-agent.github.io/aegis-transfer/)

**Created by [Talos](https://github.com/talos-agent)** - A revolutionary decentralized application that eliminates the stress of cryptocurrency payments by enabling **secure, cancellable transfers** and **invoice functionality**. Say goodbye to the anxiety of sending crypto to wrong addresses or waiting for payment confirmations!

> **The Problem**: Traditional crypto payments are irreversible and stressful - one wrong address and your funds are gone forever.
> 
> **The Solution**: Aegis Transfer requires recipient acceptance and allows cancellation, making crypto payments as safe as traditional banking.

## Table of Contents

- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Invoice System](#invoice-system)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development](#development)
- [Live Demo](#live-demo)
- [Contributing](#contributing)

## Key Features

### **Secure Cancellable Transfers**
- Send funds that can be **cancelled if not claimed** within a timeframe
- **Eliminate address errors** - if recipient doesn't claim, you get your money back
- **Time-based expiry** - transfers automatically become cancellable after set duration
- **Optional claim codes** for additional security on sensitive transfers

### **Invoice System** 
- **Request payments** from specific addresses with detailed descriptions
- **Professional invoicing** for freelancers, businesses, and service providers
- **Automatic payment tracking** and status management
- **Expiry dates** for invoice validity

### **Complete Transfer Management**
- **Dashboard view** of all pending incoming and outgoing transfers
- **Real-time status** tracking (pending, claimed, cancelled, expired)
- **Multi-token support** - ETH and ERC20 tokens
- **Gas-optimized** smart contracts built with Foundry

## How It Works

### For Senders (Much Less Stress!)

1. **Create Transfer**: Send funds to a recipient address with optional expiry time
2. **Add Security**: Optionally include a claim code for sensitive transfers  
3. **Stay in Control**: Cancel anytime if the transfer isn't claimed
4. **Peace of Mind**: No more worrying about wrong addresses!

```solidity
// Example: Send 1 ETH with 7-day expiry and claim code
createTransfer(
    recipientAddress,
    address(0),        // ETH
    0,                 // amount in msg.value
    7 days,            // expiry duration
    "secret123"        // optional claim code
)
```

### For Recipients (Simple & Secure!)

1. **Receive Notification**: Get notified of incoming transfers
2. **Review Details**: Check amount, sender, and any requirements
3. **Claim Funds**: Use claim code (if required) to receive funds
4. **Instant Settlement**: Funds transferred directly to your wallet

```solidity
// Claim transfer with code
claimTransfer(transferId, "secret123")
```

## Invoice System

Perfect for freelancers, businesses, and anyone who needs to request payments professionally!

### Creating Invoices

```solidity
// Request 0.5 ETH payment with 30-day expiry
createInvoice(
    payerAddress,
    address(0),                    // ETH
    500000000000000000,           // 0.5 ETH in wei
    30 days,                      // expiry
    "Web development services"     // description
)
```

### Paying Invoices

```solidity
// Pay invoice by ID
payInvoice(invoiceId) // with ETH value
```

### Use Cases
- **Freelance Work**: Request payment for completed projects
- **Business Services**: Professional invoicing with crypto payments  
- **Recurring Payments**: Set up regular payment requests
- **Escrow Alternative**: Secure payment requests with expiry dates

## Architecture

### Smart Contracts (Foundry + Solidity)
- **SafeTransfer.sol**: Core contract implementing cancellable transfers and invoices
- **ISafeTransfer.sol**: Interface defining contract functionality
- **Comprehensive Testing**: Full test suite with edge case coverage
- **Gas Optimized**: Efficient storage patterns and minimal gas usage

### Frontend (Next.js + React)
- **Modern UI**: Clean, intuitive interface for all transfer operations
- **Web3 Integration**: Seamless wallet connection and transaction handling
- **Real-time Updates**: Live status tracking and notifications
- **Mobile Responsive**: Works perfectly on all devices

### Key Components
```
Smart Contract Layer
├── Transfer Management (create, claim, cancel)
├── Invoice System (create, pay, track)
├── Security Features (claim codes, expiry)
└── Multi-token Support (ETH + ERC20)

Frontend Layer  
├── Transfer Dashboard
├── Invoice Management
├── Wallet Integration
└── Transaction History
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Foundry toolkit

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/talos-agent/aegis-transfer.git
cd aegis-transfer
```

2. **Set up Smart Contracts**
```bash
cd contracts
forge install
forge build
forge test
```

3. **Set up Frontend**
```bash
cd ../frontend
npm install
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:3000` to see the application

### Environment Setup

Create `.env.local` in the frontend directory:
```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
```

## Project Structure

```
aegis-transfer/
├── README.md                    # This comprehensive guide
├── contracts/                   # Smart contract system
│   ├── src/SafeTransfer.sol    # Core transfer logic
│   ├── src/ISafeTransfer.sol   # Contract interface
│   ├── test/                   # Comprehensive test suite
│   ├── script/                 # Deployment scripts
│   └── foundry.toml            # Foundry configuration
├── frontend/                    # Next.js web application
│   ├── src/                    # React components and logic
│   │   ├── components/         # UI components
│   │   ├── lib/                # Web3 integration
│   │   └── app/                # Next.js app router
│   ├── public/                 # Static assets
│   └── package.json            # Dependencies
└── .github/workflows/          # CI/CD automation
    └── deploy-pages.yml        # GitHub Pages deployment
```

## Development

### Smart Contract Development

```bash
# Build contracts
forge build

# Run tests
forge test

# Run tests with gas reporting
forge test --gas-report

# Deploy to local network
anvil # In separate terminal
forge script script/SafeTransfer.s.sol --rpc-url http://localhost:8545 --private-key <key>
```

### Frontend Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Testing

The project includes comprehensive testing:
- **Unit Tests**: Individual function testing
- **Integration Tests**: End-to-end workflow testing  
- **Edge Cases**: Boundary conditions and error scenarios
- **Gas Optimization**: Gas usage analysis and optimization

## Live Demo

**Try Aegis Transfer**: [https://talos-agent.github.io/aegis-transfer/](https://talos-agent.github.io/aegis-transfer/)

Experience the future of secure crypto payments with our live deployment on GitHub Pages!

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`forge test` and `npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation as needed
- Ensure all CI checks pass

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Talos** - Creator and lead developer
- **Foundry** - Excellent smart contract development toolkit
- **Next.js** - Powerful React framework
- **The Ethereum Community** - For building the infrastructure that makes this possible

---

**Built with ❤️ by [Talos](https://github.com/talos-agent)** | **Making crypto payments stress-free, one transfer at a time**
