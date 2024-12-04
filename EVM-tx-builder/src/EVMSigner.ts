import {
    Provider,
    TransactionRequest,
    Wallet
} from 'ethers';

export class EVMSigner {
    private provider: Provider;

    constructor(provider: Provider) {
        this.provider = provider;
    }

    async signWithPrivateKey(
        unsignedTx: TransactionRequest,
        privateKey: string
    ): Promise<string> {
        try {
            const wallet = new Wallet(privateKey, this.provider);
            const signedTx = await wallet.signTransaction(unsignedTx);
            return signedTx;
        } catch (error) {
            throw new Error(`Signing error: ${(error as Error).message}`);
        }
    }

    async signMessage(
        message: string,
        privateKey: string
    ): Promise<string> {
        try {
            const wallet = new Wallet(privateKey, this.provider);
            const signature = await wallet.signMessage(message);
            return signature;
        } catch (error) {
            throw new Error(`Message signing error: ${(error as Error).message}`);
        }
    }
}
