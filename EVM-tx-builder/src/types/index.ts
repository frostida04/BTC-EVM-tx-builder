import { TransactionRequest } from 'ethers';

export interface TransactionResult {
    signedTx: string;
    feeTx?: string;
    hash?: string;
    raw: TransactionRequest;
    estimatedGasCost: string;
    feeAmount: string;
}

export interface TransactionOptions {
    gasLimit?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
}

export interface NFTTransferOptions extends TransactionOptions {
    safe?: boolean;
    data?: string;
}

export interface FeeConfig {
    feePercentage: number;
    flatFeeGwei: string;
    feeCollector: string;
}
