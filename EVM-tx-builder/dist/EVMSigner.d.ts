import { Provider, TransactionRequest } from 'ethers';
export declare class EVMSigner {
    private provider;
    constructor(provider: Provider);
    signWithPrivateKey(unsignedTx: TransactionRequest, privateKey: string): Promise<string>;
    signMessage(message: string, privateKey: string): Promise<string>;
}
