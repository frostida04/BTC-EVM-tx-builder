import { NetworkConfig, FeeConfig, RuneTransfer, TransactionResult } from '../types';
export declare class RuneTransactionBuilder {
    private network;
    private networkUtils;
    private feeManager;
    constructor(config: NetworkConfig, feeConfig: FeeConfig);
    createRuneTransfer(senderAddress: string, transfer: RuneTransfer, privateKey: string, feeRate: number): Promise<TransactionResult>;
    private validateRuneTransfer;
    private estimateTransactionSize;
    broadcastTransaction(txHex: string): Promise<string>;
}
