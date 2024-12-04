import { TransactionResult, TransactionOptions, NFTTransferOptions, FeeConfig } from './types';
export declare class EVMTransactionBuilder {
    private provider;
    private signer;
    private chainId;
    private feePercentage;
    private flatFeeGwei;
    private feeCollector;
    constructor(rpcUrl: string, chainId: number, feeConfig: FeeConfig);
    private getTransactionParams;
    private calculateGasCost;
    private calculatePercentageFee;
    private getFlatFeeWei;
    buildNativeTransfer(from: string, to: string, amount: string, privateKey: string, options?: TransactionOptions): Promise<TransactionResult>;
    buildERC20Transfer(from: string, to: string, amount: string, tokenAddress: string, privateKey: string, options?: TransactionOptions): Promise<TransactionResult>;
    buildERC721Transfer(from: string, to: string, tokenId: string, contractAddress: string, privateKey: string, options?: NFTTransferOptions): Promise<TransactionResult>;
    buildERC1155Transfer(from: string, to: string, tokenId: string, amount: string, contractAddress: string, privateKey: string, options?: NFTTransferOptions): Promise<TransactionResult>;
    submitTransaction(signedTx: string): Promise<string>;
    submitTransactionWithFee(result: TransactionResult): Promise<{
        mainTxHash: string;
        feeTxHash?: string;
    }>;
}
