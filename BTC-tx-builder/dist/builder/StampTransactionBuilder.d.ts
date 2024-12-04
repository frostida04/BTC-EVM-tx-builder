import { NetworkConfig, FeeConfig, StampInscription, TransactionResult } from '../types';
export declare class StampTransactionBuilder {
    private network;
    private networkUtils;
    private feeManager;
    constructor(config: NetworkConfig, feeConfig: FeeConfig);
    createStampInscription(senderAddress: string, stampData: StampInscription, privateKey: string, feeRate: number): Promise<TransactionResult>;
    private validateStampInscription;
    private createStampInscriptionScript;
    private calculateInscriptionSize;
    private estimateTransactionSize;
    private generateStampId;
    broadcastTransaction(txHex: string): Promise<string>;
}
