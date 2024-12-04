import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { 
    NetworkConfig, 
    FeeConfig, 
    UTXO, 
    TransactionResult,
    ValidationResult 
} from '../types';
import { NetworkUtils } from '../utils/network';
import { ValidationUtils } from '../utils/validation';
import { FeeManager } from '../utils/FeeManager';
import { DUST_THRESHOLD, ERROR_MESSAGES } from '../constants';
import { convertToSigner } from '../utils/signerUtils';
const ECPair = ECPairFactory(ecc);

export class BTCTransactionBuilder {
    private network: bitcoin.Network;
    private networkUtils: NetworkUtils;
    private feeManager: FeeManager;

    constructor(config: NetworkConfig, feeConfig: FeeConfig) {
        this.network = config.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        this.networkUtils = new NetworkUtils(config.apiBaseUrl);
        this.feeManager = new FeeManager(feeConfig);
    }

    async createTransaction(
        senderAddress: string,
        recipientAddress: string,
        amount: number,
        privateKey: string,
        feeRate: number
    ): Promise<TransactionResult> {
        // Validate inputs
        this.validateTransactionInputs(senderAddress, recipientAddress, amount, privateKey, feeRate);

        // Calculate protocol fee
        const feeCalculation = this.feeManager.calculateNativeFee(amount);
        
        // Get UTXOs
        const utxos = await this.networkUtils.getUTXOs(senderAddress);
        if (!utxos.length) {
            throw new Error('NO UTXOS');
        }

        // Create and sign transaction
        const psbt = new bitcoin.Psbt({ network: this.network });
        const keyPair = ECPair.fromWIF(privateKey, this.network);
        const signer = convertToSigner(keyPair);
        // Sort UTXOs by value (descending)
        const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);
        
        let inputAmount = 0;
        let requiredAmount = amount;
        
        if (feeCalculation.feeTransactionRequired) {
            requiredAmount += feeCalculation.feeAmount;
        }

        // Add inputs
        for (const utxo of sortedUtxos) {
            if (utxo.isInscription || utxo.isRune) continue; // Skip inscription and rune UTXOs
            
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: Buffer.from(utxo.scriptPubKey, 'hex'),
                    value: utxo.value
                }
            });
            
            inputAmount += utxo.value;
            if (inputAmount >= requiredAmount) break;
        }

        if (inputAmount < requiredAmount) {
            throw new Error(ERROR_MESSAGES.INSUFFICIENT_FUNDS);
        }

        // Calculate change
        const estimatedSize = this.estimateTransactionSize(psbt.txInputs.length, feeCalculation.feeTransactionRequired ? 2 : 1);
        const fee = Math.ceil(estimatedSize * feeRate);
        const changeAmount = inputAmount - amount - fee;

        // Add outputs
        psbt.addOutput({
            address: recipientAddress,
            value: amount
        });

        if (feeCalculation.feeTransactionRequired) {
            psbt.addOutput({
                address: this.feeManager.getFeeCollector(),
                value: feeCalculation.feeAmount
            });
        }

        if (changeAmount >= DUST_THRESHOLD) {
            psbt.addOutput({
                address: senderAddress,
                value: changeAmount
            });
        }

        // Sign inputs
        for (let i = 0; i < utxos.length; i++) {
            psbt.signInput(i, signer);
        }

        // Finalize and extract transaction
        psbt.finalizeAllInputs();
        const tx = psbt.extractTransaction();

        return {
            txHex: tx.toHex(),
            txId: tx.getId(),
            fee,
            protocolFee: feeCalculation.feeAmount,
            totalFee: fee + (feeCalculation.feeTransactionRequired ? feeCalculation.feeAmount : 0)
        };
    }

    private validateTransactionInputs(
        senderAddress: string,
        recipientAddress: string,
        amount: number,
        privateKey: string,
        feeRate: number
    ): void {
        const validations: ValidationResult[] = [
            ValidationUtils.validateAddress(senderAddress, this.network),
            ValidationUtils.validateAddress(recipientAddress, this.network),
            ValidationUtils.validateAmount(amount),
            ValidationUtils.validatePrivateKey(privateKey),
            ValidationUtils.validateFeeRate(feeRate)
        ];

        const invalidValidation = validations.find(v => !v.isValid);
        if (invalidValidation) {
            throw new Error(invalidValidation.error);
        }
    }

    private estimateTransactionSize(inputCount: number, outputCount: number): number {
        // P2WPKH transaction size estimation
        return inputCount * 68 + outputCount * 31 + 10;
    }

    async broadcastTransaction(txHex: string): Promise<string> {
        return await this.networkUtils.broadcastTransaction(txHex);
    }
}
