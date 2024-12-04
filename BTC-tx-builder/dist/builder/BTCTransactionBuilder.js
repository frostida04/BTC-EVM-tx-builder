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
exports.BTCTransactionBuilder = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = require("ecpair");
const ecc = __importStar(require("tiny-secp256k1"));
const network_1 = require("../utils/network");
const validation_1 = require("../utils/validation");
const FeeManager_1 = require("../utils/FeeManager");
const constants_1 = require("../constants");
const signerUtils_1 = require("../utils/signerUtils");
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
class BTCTransactionBuilder {
    constructor(config, feeConfig) {
        this.network = config.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        this.networkUtils = new network_1.NetworkUtils(config.apiBaseUrl);
        this.feeManager = new FeeManager_1.FeeManager(feeConfig);
    }
    async createTransaction(senderAddress, recipientAddress, amount, privateKey, feeRate) {
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
        const signer = (0, signerUtils_1.convertToSigner)(keyPair);
        // Sort UTXOs by value (descending)
        const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);
        let inputAmount = 0;
        let requiredAmount = amount;
        if (feeCalculation.feeTransactionRequired) {
            requiredAmount += feeCalculation.feeAmount;
        }
        // Add inputs
        for (const utxo of sortedUtxos) {
            if (utxo.isInscription || utxo.isRune)
                continue; // Skip inscription and rune UTXOs
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: Buffer.from(utxo.scriptPubKey, 'hex'),
                    value: utxo.value
                }
            });
            inputAmount += utxo.value;
            if (inputAmount >= requiredAmount)
                break;
        }
        if (inputAmount < requiredAmount) {
            throw new Error(constants_1.ERROR_MESSAGES.INSUFFICIENT_FUNDS);
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
            fee,
            protocolFee: feeCalculation.feeAmount,
            totalFee: fee + (feeCalculation.feeTransactionRequired ? feeCalculation.feeAmount : 0)
        };
    }
    validateTransactionInputs(senderAddress, recipientAddress, amount, privateKey, feeRate) {
        const validations = [
            validation_1.ValidationUtils.validateAddress(senderAddress, this.network),
            validation_1.ValidationUtils.validateAddress(recipientAddress, this.network),
            validation_1.ValidationUtils.validateAmount(amount),
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
exports.BTCTransactionBuilder = BTCTransactionBuilder;
