import {
    ethers,
    TransactionRequest,
    Interface,
    JsonRpcProvider,
    FeeData
} from 'ethers';
import { EVMSigner } from './EVMSigner';
import { ERC20_ABI, ERC721_ABI, ERC1155_ABI } from './constants/abi';
import { TransactionResult, TransactionOptions, NFTTransferOptions, FeeConfig } from './types';

export class EVMTransactionBuilder {
    private provider: JsonRpcProvider;
    private signer: EVMSigner;
    private chainId: number;
    private feePercentage: number;
    private flatFeeGwei: bigint;
    private feeCollector: string;

    constructor(
        rpcUrl: string, 
        chainId: number, 
        feeConfig: FeeConfig
    ) {
        this.provider = new JsonRpcProvider(rpcUrl);
        this.signer = new EVMSigner(this.provider);
        this.chainId = chainId;
        this.feePercentage = feeConfig.feePercentage;
        this.flatFeeGwei = BigInt(feeConfig.flatFeeGwei);
        this.feeCollector = feeConfig.feeCollector;
    }

    private async getTransactionParams(from: string): Promise<{
        nonce: number;
        feeData: FeeData;
    }> {
        const [nonce, feeData] = await Promise.all([
            this.provider.getTransactionCount(from),
            this.provider.getFeeData(),
        ]);
        return { nonce, feeData };
    }

    private calculateGasCost(gasLimit: bigint, maxFeePerGas: bigint | null): string {
        const fee = maxFeePerGas || BigInt(0);
        return (gasLimit * fee).toString();
    }

    private calculatePercentageFee(amount: string): bigint {
        const value = ethers.parseEther(amount);
        return (value * BigInt(Math.floor(this.feePercentage * 1000))) / BigInt(100000);
    }

    private getFlatFeeWei(): bigint {
        return this.flatFeeGwei;
    }

    async buildNativeTransfer(
        from: string,
        to: string,
        amount: string,
        privateKey: string,
        options?: TransactionOptions
    ): Promise<TransactionResult> {
        try {
            const { nonce, feeData } = await this.getTransactionParams(from);
            const gasLimit = options?.gasLimit || BigInt(21000);
            const maxFeePerGas = options?.maxFeePerGas || 
                (feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : BigInt(0));

            const originalValue = ethers.parseEther(amount);
            const percentageFee = this.calculatePercentageFee(amount);

            const mainTx: TransactionRequest = {
                from,
                to,
                value: originalValue - percentageFee,
                nonce,
                chainId: this.chainId,
                type: 2,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas: options?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
            };

            const feeTx: TransactionRequest = {
                from,
                to: this.feeCollector,
                value: percentageFee,
                nonce: nonce + 1,
                chainId: this.chainId,
                type: 2,
                gasLimit: BigInt(21000),
                maxFeePerGas,
                maxPriorityFeePerGas: options?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
            };

            const signedMainTx = await this.signer.signWithPrivateKey(mainTx, privateKey);
            const signedFeeTx = await this.signer.signWithPrivateKey(feeTx, privateKey);

            return {
                signedTx: signedMainTx,
                feeTx: signedFeeTx,
                raw: mainTx,
                estimatedGasCost: this.calculateGasCost(gasLimit, maxFeePerGas),
                feeAmount: percentageFee.toString(),
            };
        } catch (error) {
            throw new Error(`Native transfer build failed: ${(error as Error).message}`);
        }
    }

    async buildERC20Transfer(
        from: string,
        to: string,
        amount: string,
        tokenAddress: string,
        privateKey: string,
        options?: TransactionOptions
    ): Promise<TransactionResult> {
        try {
            const { nonce, feeData } = await this.getTransactionParams(from);

            const erc20Interface = new Interface(ERC20_ABI);
            const data = erc20Interface.encodeFunctionData('transfer', [to, amount]);

            const estimatedGas = await this.provider.estimateGas({
                from,
                to: tokenAddress,
                data,
            });

            const gasLimit = options?.gasLimit || estimatedGas;
            const maxFeePerGas = options?.maxFeePerGas || 
                (feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : BigInt(0));

            const tx: TransactionRequest = {
                from,
                to: tokenAddress,
                data,
                nonce,
                chainId: this.chainId,
                type: 2,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas: options?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
            };

            const feeTx: TransactionRequest = {
                from,
                to: this.feeCollector,
                value: this.getFlatFeeWei(),
                nonce: nonce + 1,
                chainId: this.chainId,
                type: 2,
                gasLimit: BigInt(21000),
                maxFeePerGas,
                maxPriorityFeePerGas: options?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
            };

            const signedTx = await this.signer.signWithPrivateKey(tx, privateKey);
            const signedFeeTx = await this.signer.signWithPrivateKey(feeTx, privateKey);

            return {
                signedTx,
                feeTx: signedFeeTx,
                raw: tx,
                estimatedGasCost: this.calculateGasCost(BigInt(gasLimit.toString()), maxFeePerGas),
                feeAmount: this.getFlatFeeWei().toString(),
            };
        } catch (error) {
            throw new Error(`ERC20 transfer build failed: ${(error as Error).message}`);
        }
    }

    async buildERC721Transfer(
        from: string,
        to: string,
        tokenId: string,
        contractAddress: string,
        privateKey: string,
        options?: NFTTransferOptions
    ): Promise<TransactionResult> {
        try {
            const { nonce, feeData } = await this.getTransactionParams(from);

            const erc721Interface = new Interface(ERC721_ABI);
            const methodName = options?.safe ? 'safeTransferFrom' : 'transferFrom';
            const data = erc721Interface.encodeFunctionData(methodName, [from, to, tokenId]);

            const estimatedGas = await this.provider.estimateGas({
                from,
                to: contractAddress,
                data,
            });

            const gasLimit = options?.gasLimit || estimatedGas;
            const maxFeePerGas = options?.maxFeePerGas || 
                (feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : BigInt(0));

            const nftTx: TransactionRequest = {
                from,
                to: contractAddress,
                data,
                nonce,
                chainId: this.chainId,
                type: 2,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas: options?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
            };

            const feeTx: TransactionRequest = {
                from,
                to: this.feeCollector,
                value: this.getFlatFeeWei(),
                nonce: nonce + 1,
                chainId: this.chainId,
                type: 2,
                gasLimit: BigInt(21000),
                maxFeePerGas,
                maxPriorityFeePerGas: options?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
            };

            const signedNftTx = await this.signer.signWithPrivateKey(nftTx, privateKey);
            const signedFeeTx = await this.signer.signWithPrivateKey(feeTx, privateKey);

            return {
                signedTx: signedNftTx,
                feeTx: signedFeeTx,
                raw: nftTx,
                estimatedGasCost: this.calculateGasCost(gasLimit, maxFeePerGas),
                feeAmount: this.getFlatFeeWei().toString(),
            };
        } catch (error) {
            throw new Error(`ERC721 transfer build failed: ${(error as Error).message}`);
        }
    }

    async buildERC1155Transfer(
        from: string,
        to: string,
        tokenId: string,
        amount: string,
        contractAddress: string,
        privateKey: string,
        options?: NFTTransferOptions
    ): Promise<TransactionResult> {
        try {
            const { nonce, feeData } = await this.getTransactionParams(from);

            const erc1155Interface = new Interface(ERC1155_ABI);
            const data = erc1155Interface.encodeFunctionData('safeTransferFrom', [
                from,
                to,
                tokenId,
                amount,
                options?.data || '0x',
            ]);

            const estimatedGas = await this.provider.estimateGas({
                from,
                to: contractAddress,
                data,
            });

            const gasLimit = options?.gasLimit || estimatedGas;
            const maxFeePerGas = options?.maxFeePerGas || 
                (feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : BigInt(0));

            const nftTx: TransactionRequest = {
                from,
                to: contractAddress,
                data,
                nonce,
                chainId: this.chainId,
                type: 2,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas: options?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
            };

            const feeTx: TransactionRequest = {
                from,
                to: this.feeCollector,
                value: this.getFlatFeeWei(),
                nonce: nonce + 1,
                chainId: this.chainId,
                type: 2,
                gasLimit: BigInt(21000),
                maxFeePerGas,
                maxPriorityFeePerGas: options?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
            };

            const signedNftTx = await this.signer.signWithPrivateKey(nftTx, privateKey);
            const signedFeeTx = await this.signer.signWithPrivateKey(feeTx, privateKey);

            return {
                signedTx: signedNftTx,
                feeTx: signedFeeTx,
                raw: nftTx,
                estimatedGasCost: this.calculateGasCost(gasLimit, maxFeePerGas),
                feeAmount: this.getFlatFeeWei().toString(),
            };
        } catch (error) {
            throw new Error(`ERC1155 transfer build failed: ${(error as Error).message}`);
        }
    }

    async submitTransaction(signedTx: string): Promise<string> {
        try {
            const tx = await this.provider.broadcastTransaction(signedTx);
            return tx.hash;
        } catch (error) {
            throw new Error(`Transaction submission failed: ${(error as Error).message}`);
        }
    }

    async submitTransactionWithFee(result: TransactionResult): Promise<{
        mainTxHash: string;
        feeTxHash?: string;
    }> {
        try {
            const mainTxHash = await this.submitTransaction(result.signedTx);
            let feeTxHash;

            if (result.feeTx) {
                feeTxHash = await this.submitTransaction(result.feeTx);
            }

            return {
                mainTxHash,
                feeTxHash
            };
        } catch (error) {
            throw new Error(`Transaction submission failed: ${(error as Error).message}`);
        }
    }
}
