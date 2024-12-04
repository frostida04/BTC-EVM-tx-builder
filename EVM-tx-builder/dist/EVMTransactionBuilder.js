"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMTransactionBuilder = void 0;
const ethers_1 = require("ethers");
const EVMSigner_1 = require("./EVMSigner");
const abi_1 = require("./constants/abi");
class EVMTransactionBuilder {
    constructor(rpcUrl, chainId, feeConfig) {
        this.provider = new ethers_1.JsonRpcProvider(rpcUrl);
        this.signer = new EVMSigner_1.EVMSigner(this.provider);
        this.chainId = chainId;
        this.feePercentage = feeConfig.feePercentage;
        this.flatFeeGwei = BigInt(feeConfig.flatFeeGwei);
        this.feeCollector = feeConfig.feeCollector;
    }
    async getTransactionParams(from) {
        const [nonce, feeData] = await Promise.all([
            this.provider.getTransactionCount(from),
            this.provider.getFeeData(),
        ]);
        return { nonce, feeData };
    }
    calculateGasCost(gasLimit, maxFeePerGas) {
        const fee = maxFeePerGas || BigInt(0);
        return (gasLimit * fee).toString();
    }
    calculatePercentageFee(amount) {
        const value = ethers_1.ethers.parseEther(amount);
        return (value * BigInt(Math.floor(this.feePercentage * 1000))) / BigInt(100000);
    }
    getFlatFeeWei() {
        return this.flatFeeGwei;
    }
    async buildNativeTransfer(from, to, amount, privateKey, options) {
        try {
            const { nonce, feeData } = await this.getTransactionParams(from);
            const gasLimit = options?.gasLimit || BigInt(21000);
            const maxFeePerGas = options?.maxFeePerGas ||
                (feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : BigInt(0));
            const originalValue = ethers_1.ethers.parseEther(amount);
            const percentageFee = this.calculatePercentageFee(amount);
            const mainTx = {
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
            const feeTx = {
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
        }
        catch (error) {
            throw new Error(`Native transfer build failed: ${error.message}`);
        }
    }
    async buildERC20Transfer(from, to, amount, tokenAddress, privateKey, options) {
        try {
            const { nonce, feeData } = await this.getTransactionParams(from);
            const erc20Interface = new ethers_1.Interface(abi_1.ERC20_ABI);
            const data = erc20Interface.encodeFunctionData('transfer', [to, amount]);
            const estimatedGas = await this.provider.estimateGas({
                from,
                to: tokenAddress,
                data,
            });
            const gasLimit = options?.gasLimit || estimatedGas;
            const maxFeePerGas = options?.maxFeePerGas ||
                (feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : BigInt(0));
            const tx = {
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
            const feeTx = {
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
        }
        catch (error) {
            throw new Error(`ERC20 transfer build failed: ${error.message}`);
        }
    }
    async buildERC721Transfer(from, to, tokenId, contractAddress, privateKey, options) {
        try {
            const { nonce, feeData } = await this.getTransactionParams(from);
            const erc721Interface = new ethers_1.Interface(abi_1.ERC721_ABI);
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
            const nftTx = {
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
            const feeTx = {
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
        }
        catch (error) {
            throw new Error(`ERC721 transfer build failed: ${error.message}`);
        }
    }
    async buildERC1155Transfer(from, to, tokenId, amount, contractAddress, privateKey, options) {
        try {
            const { nonce, feeData } = await this.getTransactionParams(from);
            const erc1155Interface = new ethers_1.Interface(abi_1.ERC1155_ABI);
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
            const nftTx = {
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
            const feeTx = {
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
        }
        catch (error) {
            throw new Error(`ERC1155 transfer build failed: ${error.message}`);
        }
    }
    async submitTransaction(signedTx) {
        try {
            const tx = await this.provider.broadcastTransaction(signedTx);
            return tx.hash;
        }
        catch (error) {
            throw new Error(`Transaction submission failed: ${error.message}`);
        }
    }
    async submitTransactionWithFee(result) {
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
        }
        catch (error) {
            throw new Error(`Transaction submission failed: ${error.message}`);
        }
    }
}
exports.EVMTransactionBuilder = EVMTransactionBuilder;
