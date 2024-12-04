# EVM Transaction Builder with Fee Injection

A TypeScript library for building and managing Ethereum (EVM) transactions with integrated fee collection functionality.

## Features

- Native token (ETH) transfers with percentage-based fees
- ERC20 token transfers
- ERC721 (NFT) transfers with flat fees
- ERC1155 transfers
- Support for EIP-1559 transactions
- Automatic fee calculation and injection
- Separate fee collection transactions
- Gas estimation and optimization

## Installation

```bash
# Using npm
npm install evm-transaction-builder

# Using yarn
yarn add evm-transaction-builder
```

## Usage

```typescript
import { EVMTransactionBuilder } from 'evm-transaction-builder';

const feeConfig = {
    feePercentage: 0.5,
    flatFeeGwei: "1000000000",
    feeCollector: "0xFeeCollectorAddress"
};

const builder = new EVMTransactionBuilder(
    "YOUR_RPC_URL",
    1, // chainId
    feeConfig
);

// Example: Native transfer with fee
const result = await builder.buildNativeTransfer(
    "0xSender",
    "0xRecipient",
    "1.0", // amount in ETH
    "privateKey"
);

// Submit the transaction
const { mainTxHash, feeTxHash } = await builder.submitTransactionWithFee(result);
```

## Fee Configuration

```typescript
interface FeeConfig {
    feePercentage: number;    // Fee percentage for native transfers
    flatFeeGwei: string;      // Flat fee in Gwei for NFT transfers
    feeCollector: string;     // Fee collector address
}
```

### EVMTransactionBuilder

#### Constructor