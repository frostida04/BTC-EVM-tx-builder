"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuneTransactionBuilder = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = require("ecpair");
const ecc = __importStar(require("tiny-secp256k1"));
const network_1 = require("../utils/network");
const validation_1 = require("../utils/validation");
const FeeManager_1 = require("../utils/FeeManager");
const constants_1 = require("../constants");
const signerUtils_1 = require("../utils/signerUtils");
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
class RuneTransactionBuilder {
    constructor(config, feeConfig) {
        this.network = config.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        this.networkUtils = new network_1.NetworkUtils(config.apiBaseUrl);
        this.feeManager = new FeeManager_1.FeeManager(feeConfig);
    }
    async createRuneTransfer(senderAddress, transfer, privateKey, feeRate) {
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
        const signer = (0, signerUtils_1.convertToSigner)(keyPair); // Convert ECPair to Signer
        // Find appropriate rune UTXO
        const runeUtxo = runeUtxos.find(utxo => utxo.value >= transfer.amount);
        if (!runeUtxo) {
            throw new Error(constants_1.ERROR_MESSAGES.INSUFFICIENT_RUNE_BALANCE);
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
        const requiredFunding = constants_1.DUST_THRESHOLD + (feeCalculation.feeTransactionRequired ? feeCalculation.feeAmount : 0);
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
            if (fundingAmount >= requiredFunding)
                break;
        }
        if (fundingAmount < requiredFunding) {
            throw new Error(constants_1.ERROR_MESSAGES.INSUFFICIENT_FUNDS);
        }
        // Add outputs
        // Rune transfer output
        psbt.addOutput({
            address: transfer.destinationAddress,
            value: constants_1.DUST_THRESHOLD
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
                value: constants_1.DUST_THRESHOLD
            });
        }
        // Calculate and add BTC change output
        const estimatedSize = this.estimateTransactionSize(psbt.txInputs.length, psbt.txOutputs.length);
        const minerFee = Math.ceil(estimatedSize * feeRate);
        const changeAmount = fundingAmount - minerFee - (psbt.txOutputs.length * constants_1.DUST_THRESHOLD);
        if (changeAmount >= constants_1.DUST_THRESHOLD) {
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
    validateRuneTransfer(senderAddress, transfer, privateKey, feeRate) {
        const validations = [
            validation_1.ValidationUtils.validateAddress(senderAddress, this.network),
            validation_1.ValidationUtils.validateAddress(transfer.destinationAddress, this.network),
            validation_1.ValidationUtils.validateRuneTransfer(transfer.runeId, transfer.amount),
            validation_1.ValidationUtils.validatePrivateKey(privateKey),
            validation_1.ValidationUtils.validateFeeRate(feeRate)
        ];
        const invalidValidation = validations.find(v => !v.isValid);
        if (invalidValidation) {
            throw new Error(invalidValidation.error);
        }
    }
    estimateTransactionSize(inputCount, outputCount) {
        // P2WPKH transaction size estimation
        return inputCount * 68 + outputCount * 31 + 10;
    }
    async broadcastTransaction(txHex) {
        return await this.networkUtils.broadcastTransaction(txHex);
    }
}
exports.RuneTransactionBuilder = RuneTransactionBuilder;
