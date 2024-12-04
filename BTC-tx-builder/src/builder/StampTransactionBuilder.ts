import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { 
    NetworkConfig, 
    FeeConfig, 
    StampInscription,
    TransactionResult 
} from '../types';
import { NetworkUtils } from '../utils/network';
import { ValidationUtils } from '../utils/validation';
import { FeeManager } from '../utils/FeeManager';
import { DUST_THRESHOLD, ERROR_MESSAGES } from '../constants';
import { convertToSigner } from '../utils/signerUtils';
const ECPair = ECPairFactory(ecc);

export class StampTransactionBuilder {
    private network: bitcoin.Network;
    private networkUtils: NetworkUtils;
    private feeManager: FeeManager;

    constructor(config: NetworkConfig, feeConfig: FeeConfig) {
        this.network = config.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        this.networkUtils = new NetworkUtils(config.apiBaseUrl);
        this.feeManager = new FeeManager(feeConfig);
    }

    async createStampInscription(
        senderAddress: string,
        stampData: StampInscription,
        privateKey: string,
        feeRate: number
    ): Promise<TransactionResult> {
        // Validate inputs
        this.validateStampInscription(senderAddress, stampData, privateKey, feeRate);

        // Calculate protocol fee
        const feeCalculation = this.feeManager.calculateFlatFee();

        // Get UTXOs
        const utxos = await this.networkUtils.getUTXOs(senderAddress);
        const fundingUtxos = utxos.filter(utxo => !utxo.isInscription && !utxo.isRune);

        if (!fundingUtxos.length) {
            throw new Error('NO_UTXOS');
        }

        // Create transaction
        const psbt = new bitcoin.Psbt({ network: this.network });
        const keyPair = ECPair.fromWIF(privateKey, this.network);
        const signer = convertToSigner(keyPair); // Convert ECPair to Signer
        // Calculate required funding
        const inscriptionSize = this.calculateInscriptionSize(stampData);
        const inscriptionCost = DUST_THRESHOLD + Math.ceil(inscriptionSize * feeRate);
        const requiredFunding = inscriptionCost +
            (feeCalculation.feeTransactionRequired ? feeCalculation.feeAmount : 0);

        // Add funding inputs
        let fundingAmount = 0;
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

        // Create inscription output
        const inscriptionScript = this.createStampInscriptionScript(stampData);
        psbt.addOutput({
            script: inscriptionScript,
            value: DUST_THRESHOLD
        });

        // Add protocol fee output if required
        if (feeCalculation.feeTransactionRequired) {
            psbt.addOutput({
                address: this.feeManager.getFeeCollector(),
                value: feeCalculation.feeAmount
            });
        }

        // Calculate and add change output
        const estimatedSize = this.estimateTransactionSize(psbt.txInputs.length, psbt.txOutputs.length);
        const minerFee = Math.ceil(estimatedSize * feeRate);
        const changeAmount = fundingAmount - minerFee - DUST_THRESHOLD - 
            (feeCalculation.feeTransactionRequired ? feeCalculation.feeAmount : 0);

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
            stampInscription: {
                contentType: stampData.contentType,
                content: stampData.content,
                stampId: this.generateStampId(tx.getId(), 0)
            }
        };
    }

    private validateStampInscription(
        senderAddress: string,
        stampData: StampInscription,
        privateKey: string,
        feeRate: number
    ): void {
        const validations = [
            ValidationUtils.validateAddress(senderAddress, this.network),
            ValidationUtils.validateStampData(stampData),
            ValidationUtils.validatePrivateKey(privateKey),
            ValidationUtils.validateFeeRate(feeRate)
        ];

        const invalidValidation = validations.find(v => !v.isValid);
        if (invalidValidation) {
            throw new Error(invalidValidation.error);
        }
    }

    private createStampInscriptionScript(stampData: StampInscription): Buffer {
        const contentTypeData = Buffer.from(stampData.contentType);
        const contentData = Buffer.from(stampData.content);

        // Create inscription script following the stamp protocol
        const script = bitcoin.script.compile([
            bitcoin.opcodes.OP_FALSE,
            bitcoin.opcodes.OP_IF,
            Buffer.from('stamp'),
            contentTypeData,
            contentData,
            bitcoin.opcodes.OP_ENDIF
        ]);

        return script;
    }

    private calculateInscriptionSize(stampData: StampInscription): number {
        // Base inscription overhead + content type length + content length
        return 100 + stampData.contentType.length + stampData.content.length;
    }

    private estimateTransactionSize(inputCount: number, outputCount: number): number {
        // P2WPKH transaction size estimation with inscription
        return inputCount * 68 + outputCount * 43 + 10;
    }

    private generateStampId(txId: string, outputIndex: number): string {
        return `${txId}i${outputIndex}`;
    }

    async broadcastTransaction(txHex: string): Promise<string> {
        return await this.networkUtils.broadcastTransaction(txHex);
    }
}
