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
exports.XCPTransactionBuilder = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = require("ecpair");
const ecc = __importStar(require("tiny-secp256k1"));
const network_1 = require("../utils/network");
const validation_1 = require("../utils/validation");
const constants_1 = require("../constants");
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
class XCPTransactionBuilder {
    constructor(config) {
        this.network = config.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        this.networkUtils = new network_1.NetworkUtils(config.apiBaseUrl);
    }
    estimateVsize(psbt) {
        // Clone the PSBT to avoid modifying the original
        const psbtClone = bitcoin.Psbt.fromBase64(psbt.toBase64());
        // Estimate input size (assuming P2WPKH inputs)
        const inputSize = psbtClone.data.inputs.length * 98; // ~98 bytes per P2WPKH input
        // Estimate output size
        const outputSize = psbtClone.txOutputs.length * 43; // ~43 bytes per output
        // Add transaction overhead
        const overhead = 10; // Version, locktime, etc.
        // Calculate total virtual size (vsize)
        return Math.ceil(overhead + inputSize + outputSize);
    }
    selectUtxos(utxos, amount, feeRate) {
        const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);
        const selectedUtxos = [];
        let totalInput = 0;
        const estimatedFee = Math.ceil(bitcoin.Transaction.DEFAULT_SEQUENCE * feeRate);
        const targetAmount = amount + estimatedFee;
        for (const utxo of sortedUtxos) {
            if (utxo.isInscription)
                continue;
            selectedUtxos.push(utxo);
            totalInput += utxo.value;
            if (totalInput >= targetAmount)
                break;
        }
        return { selectedUtxos, totalInput };
    }
    createXCPOpReturn(xcpTransfer) {
        // Validate XCP transfer data
        if (!xcpTransfer.asset || !xcpTransfer.amount || xcpTransfer.amount <= 0) {
            throw new Error(constants_1.ERROR_MESSAGES.INVALID_XCP_DATA);
        }
        const xcpData = {
            p: constants_1.XCP_PROTOCOL_ID,
            op: 'send',
            asset: xcpTransfer.asset,
            qty: xcpTransfer.amount.toString(),
            memo: xcpTransfer.memo || ''
        };
        const data = Buffer.from(JSON.stringify(xcpData));
        if (data.length > constants_1.OP_RETURN_MAX_SIZE) {
            throw new Error("XCP Too large data");
        }
        return data;
    }
    async buildXCPTransfer(fromAddress, xcpTransfer, privateKey, feeRate) {
        // Validate inputs
        validation_1.ValidationUtils.validateAddress(fromAddress, this.network);
        validation_1.ValidationUtils.validateAddress(xcpTransfer.destinationAddress, this.network);
        validation_1.ValidationUtils.validatePrivateKey(privateKey);
        try {
            const utxos = await this.networkUtils.getUTXOs(fromAddress);
            const fees = await this.networkUtils.getFeeRates();
            const selectedFeeRate = feeRate || fees.halfHourFee;
            const psbt = new bitcoin.Psbt({ network: this.network });
            const keyPair = ECPair.fromWIF(privateKey, this.network);
            // Create OP_RETURN data for XCP transfer
            const xcpOpReturn = this.createXCPOpReturn(xcpTransfer);
            // Select UTXOs and calculate amounts
            const { selectedUtxos, totalInput } = this.selectUtxos(utxos, constants_1.DUST_THRESHOLD * 2, selectedFeeRate);
            if (!selectedUtxos.length) {
                throw new Error(constants_1.ERROR_MESSAGES.INSUFFICIENT_FUNDS);
            }
            // Add inputs
            selectedUtxos.forEach(utxo => {
                psbt.addInput({
                    hash: utxo.txid,
                    index: utxo.vout,
                    witnessUtxo: {
                        script: Buffer.from(utxo.scriptPubKey, 'hex'),
                        value: utxo.value,
                    },
                });
            });
            // Add OP_RETURN output
            psbt.addOutput({
                script: bitcoin.script.compile([
                    bitcoin.opcodes.OP_RETURN,
                    xcpOpReturn
                ]),
                value: 0,
            });
            // Add recipient output with dust
            psbt.addOutput({
                address: xcpTransfer.destinationAddress,
                value: constants_1.DUST_THRESHOLD,
            });
            // Calculate and add change if needed
            const fee = Math.ceil(this.estimateVsize(psbt) * selectedFeeRate);
            const change = totalInput - constants_1.DUST_THRESHOLD - fee;
            if (change > constants_1.DUST_THRESHOLD) {
                psbt.addOutput({
                    address: fromAddress,
                    value: change,
                });
            }
            // Sign and finalize with proper signature validation
            for (let i = 0; i < psbt.inputCount; i++) {
                psbt.signInput(i, keyPair);
                psbt.validateSignaturesOfInput(i, (pubkey, msghash, signature) => {
                    return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
                });
            }
            psbt.finalizeAllInputs();
            const tx = psbt.extractTransaction();
            const txHex = tx.toHex();
            const txId = await this.networkUtils.broadcastTransaction(txHex);
            return { txHex, txId, fee };
        }
        catch (error) {
            throw new Error(`XCP transfer failed: ${error.message}`);
        }
    }
    async buildXCPIssuance(fromAddress, assetName, amount, description, privateKey, feeRate) {
        // Validate inputs
        validation_1.ValidationUtils.validateAddress(fromAddress, this.network);
        validation_1.ValidationUtils.validatePrivateKey(privateKey);
        if (!assetName || !amount || amount <= 0) {
            throw new Error('INVALID ISSUANCE DATA');
        }
        try {
            const utxos = await this.networkUtils.getUTXOs(fromAddress);
            const fees = await this.networkUtils.getFeeRates();
            const selectedFeeRate = feeRate || fees.halfHourFee;
            const psbt = new bitcoin.Psbt({ network: this.network });
            const keyPair = ECPair.fromWIF(privateKey, this.network);
            // Create issuance data
            const issuanceData = {
                p: constants_1.XCP_PROTOCOL_ID,
                op: 'issuance',
                asset: assetName,
                qty: amount.toString(),
                description
            };
            const opReturnData = Buffer.from(JSON.stringify(issuanceData));
            if (opReturnData.length > constants_1.OP_RETURN_MAX_SIZE) {
                throw new Error('ISSUANCE DATA TOO LARGE');
            }
            // Select UTXOs and calculate amounts
            const { selectedUtxos, totalInput } = this.selectUtxos(utxos, constants_1.DUST_THRESHOLD, selectedFeeRate);
            if (!selectedUtxos.length) {
                throw new Error(constants_1.ERROR_MESSAGES.INSUFFICIENT_FUNDS);
            }
            // Add inputs
            selectedUtxos.forEach(utxo => {
                psbt.addInput({
                    hash: utxo.txid,
                    index: utxo.vout,
                    witnessUtxo: {
                        script: Buffer.from(utxo.scriptPubKey, 'hex'),
                        value: utxo.value,
                    },
                });
            });
            // Add OP_RETURN output
            psbt.addOutput({
                script: bitcoin.script.compile([
                    bitcoin.opcodes.OP_RETURN,
                    opReturnData
                ]),
                value: 0,
            });
            // Calculate and add change if needed
            const fee = Math.ceil(this.estimateVsize(psbt) * selectedFeeRate);
            const change = totalInput - fee;
            if (change > constants_1.DUST_THRESHOLD) {
                psbt.addOutput({
                    address: fromAddress,
                    value: change,
                });
            }
            // Sign and finalize with proper signature validation
            for (let i = 0; i < psbt.inputCount; i++) {
                psbt.signInput(i, keyPair);
                psbt.validateSignaturesOfInput(i, (pubkey, msghash, signature) => {
                    return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
                });
            }
            psbt.finalizeAllInputs();
            const tx = psbt.extractTransaction();
            const txHex = tx.toHex();
            const txId = await this.networkUtils.broadcastTransaction(txHex);
            return { txHex, txId, fee };
        }
        catch (error) {
            throw new Error(`XCP issuance failed: ${error.message}`);
        }
    }
}
exports.XCPTransactionBuilder = XCPTransactionBuilder;
