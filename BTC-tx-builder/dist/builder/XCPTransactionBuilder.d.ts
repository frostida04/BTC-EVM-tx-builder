import { NetworkConfig, TransactionResult, XCPTransfer } from '../types';
export declare class XCPTransactionBuilder {
    private network;
    private networkUtils;
    constructor(config: NetworkConfig);
    private estimateVsize;
    private selectUtxos;
    private createXCPOpReturn;
    buildXCPTransfer(fromAddress: string, xcpTransfer: XCPTransfer, privateKey: string, feeRate?: number): Promise<TransactionResult>;
    buildXCPIssuance(fromAddress: string, assetName: string, amount: number, description: string, privateKey: string, feeRate?: number): Promise<TransactionResult>;
}
