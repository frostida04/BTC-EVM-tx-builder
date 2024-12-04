import { NetworkConfig, FeeConfig, TransactionResult } from '../types';
export declare class BTCTransactionBuilder {
    private network;
    private networkUtils;
    private feeManager;
    constructor(config: NetworkConfig, feeConfig: FeeConfig);
    createTransaction(senderAddress: string, recipientAddress: string, amount: number, privateKey: string, feeRate: number): Promise<TransactionResult>;
    private validateTransactionInputs;
    private estimateTransactionSize;
    broadcastTransaction(txHex: string): Promise<string>;
}
