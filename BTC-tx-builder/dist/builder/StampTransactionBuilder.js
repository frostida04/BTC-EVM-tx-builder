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
exports.StampTransactionBuilder = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = require("ecpair");
const ecc = __importStar(require("tiny-secp256k1"));
const network_1 = require("../utils/network");
const validation_1 = require("../utils/validation");
const FeeManager_1 = require("../utils/FeeManager");
const constants_1 = require("../constants");
const signerUtils_1 = require("../utils/signerUtils");
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
class StampTransactionBuilder {
    constructor(config, feeConfig) {
        this.network = config.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        this.networkUtils = new network_1.NetworkUtils(config.apiBaseUrl);
        this.feeManager = new FeeManager_1.FeeManager(feeConfig);
    }
    async createStampInscription(senderAddress, stampData, privateKey, feeRate) {
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
        const signer = (0, signerUtils_1.convertToSigner)(keyPair); // Convert ECPair to Signer
        // Calculate required funding
        const inscriptionSize = this.calculateInscriptionSize(stampData);
        const inscriptionCost = constants_1.DUST_THRESHOLD + Math.ceil(inscriptionSize * feeRate);
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
            if (fundingAmount >= requiredFunding)
                break;
        }
        if (fundingAmount < requiredFunding) {
            throw new Error(constants_1.ERROR_MESSAGES.INSUFFICIENT_FUNDS);
        }
        // Create inscription output
        const inscriptionScript = this.createStampInscriptionScript(stampData);
        psbt.addOutput({
            script: inscriptionScript,
            value: constants_1.DUST_THRESHOLD
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
        const changeAmount = fundingAmount - minerFee - constants_1.DUST_THRESHOLD -
            (feeCalculation.feeTransactionRequired ? feeCalculation.feeAmount : 0);
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
            stampInscription: {
                contentType: stampData.contentType,
                content: stampData.content,
                stampId: this.generateStampId(tx.getId(), 0)
            }
        };
    }
    validateStampInscription(senderAddress, stampData, privateKey, feeRate) {
        const validations = [
            validation_1.ValidationUtils.validateAddress(senderAddress, this.network),
            validation_1.ValidationUtils.validateStampData(stampData),
            validation_1.ValidationUtils.validatePrivateKey(privateKey),
            validation_1.ValidationUtils.validateFeeRate(feeRate)
        ];
        const invalidValidation = validations.find(v => !v.isValid);
        if (invalidValidation) {
            throw new Error(invalidValidation.error);
        }
    }
    createStampInscriptionScript(stampData) {
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
    calculateInscriptionSize(stampData) {
        // Base inscription overhead + content type length + content length
        return 100 + stampData.contentType.length + stampData.content.length;
    }
    estimateTransactionSize(inputCount, outputCount) {
        // P2WPKH transaction size estimation with inscription
        return inputCount * 68 + outputCount * 43 + 10;
    }
    generateStampId(txId, outputIndex) {
        return `${txId}i${outputIndex}`;
    }
    async broadcastTransaction(txHex) {
        return await this.networkUtils.broadcastTransaction(txHex);
    }
}
exports.StampTransactionBuilder = StampTransactionBuilder;
