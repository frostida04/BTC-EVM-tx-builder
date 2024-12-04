import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { 
    NetworkConfig, 
    FeeConfig, 
    RuneTransfer,
    TransactionResult 
} from '../types';
import { NetworkUtils } from '../utils/network';
import { ValidationUtils } from '../utils/validation';
import { FeeManager } from '../utils/FeeManager';
import { DUST_THRESHOLD, ERROR_MESSAGES } from '../constants';
import { convertToSigner } from '../utils/signerUtils';
const ECPair = ECPairFactory(ecc);

export class RuneTransactionBuilder {
    private network: bitcoin.Network;
    private networkUtils: NetworkUtils;
    private feeManager: FeeManager;

    constructor(config: NetworkConfig, feeConfig: FeeConfig) {
        this.network = config.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        this.networkUtils = new NetworkUtils(config.apiBaseUrl);
        this.feeManager = new FeeManager(feeConfig);
    }

    async createRuneTransfer(
        senderAddress: string,
        transfer: RuneTransfer,
        privateKey: string,
        feeRate: number
    ): Promise<TransactionResult> {
        // Validate inputs
        this.validateRuneTransfer(senderAddress, transfer, privateKey, feeRate);

        // Calculate protocol fee
        const feeCalculation = this.feeManager.calculateFlatFee();

        // Get UTXOs
        const utxos = await this.networkUtils.getUTXOs(senderAddress);
        const runeUtxos = utxos.filter(utxo => utxo.isRune && utxo.runeId === transfer.runeId);
        
        if (!runeUtxos.length) {
            throw new Error('NO RUNE UTXOS');
        }

        // Create transaction
        const psbt = new bitcoin.Psbt({ network: this.network });
        const keyPair = ECPair.fromWIF(privateKey, this.network);
        const signer = convertToSigner(keyPair); // Convert ECPair to Signer
        // Find appropriate rune UTXO
        const runeUtxo = runeUtxos.find(utxo => utxo.value >= transfer.amount);
        if (!runeUtxo) {
            throw new Error(ERROR_MESSAGES.INSUFFICIENT_RUNE_BALANCE);
        }

        // Add rune input
        psbt.addInput({
            hash: runeUtxo.txid,
            index: runeUtxo.vout,
            witnessUtxo: {
                script: Buffer.from(runeUtxo.scriptPubKey, 'hex'),
                value: runeUtxo.value
            }
        });

        // Add funding input for fees if needed
        let fundingAmount = 0;
        const requiredFunding = DUST_THRESHOLD + (feeCalculation.feeTransactionRequired ? feeCalculation.feeAmount : 0);
        
        const fundingUtxos = utxos.filter(utxo => !utxo.isInscription && !utxo.isRune);
        for (const utxo of fundingUtxos) {
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: Buffer.from(utxo.scriptPubKey, 'hex'),
                    value: utxo.value
                }
            });
            
            fundingAmount += utxo.value;
            if (fundingAmount >= requiredFunding) break;
        }

        if (fundingAmount < requiredFunding) {
            throw new Error(ERROR_MESSAGES.INSUFFICIENT_FUNDS);
        }

        // Add outputs
        // Rune transfer output
        psbt.addOutput({
            address: transfer.destinationAddress,
            value: DUST_THRESHOLD
        });

        // Protocol fee output if required
        if (feeCalculation.feeTransactionRequired) {
            psbt.addOutput({
                address: this.feeManager.getFeeCollector(),
                value: feeCalculation.feeAmount
            });
        }

        // Change output for remaining runes if any
        const runeChange = runeUtxo.value - transfer.amount;
        if (runeChange > 0) {
            psbt.addOutput({
                address: senderAddress,
                value: DUST_THRESHOLD
            });
        }

        // Calculate and add BTC change output
        const estimatedSize = this.estimateTransactionSize(psbt.txInputs.length, psbt.txOutputs.length);
        const minerFee = Math.ceil(estimatedSize * feeRate);
        const changeAmount = fundingAmount - minerFee - (psbt.txOutputs.length * DUST_THRESHOLD);
        
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
            fee: minerFee,
            protocolFee: feeCalculation.feeAmount,
            totalFee: minerFee + feeCalculation.feeAmount,
            runeTransfer: {
                symbol: transfer.symbol,
                runeId: transfer.runeId,
                amount: transfer.amount,
                sender: senderAddress,
                recipient: transfer.recipient,
                destinationAddress: transfer.destinationAddress
            }
        };
    }

    private validateRuneTransfer(
        senderAddress: string,
        transfer: RuneTransfer,
        privateKey: string,
        feeRate: number
    ): void {
        const validations = [
            ValidationUtils.validateAddress(senderAddress, this.network),
            ValidationUtils.validateAddress(transfer.destinationAddress, this.network),
            ValidationUtils.validateRuneTransfer(transfer.runeId, transfer.amount),
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
