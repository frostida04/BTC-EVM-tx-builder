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
exports.ValidationUtils = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const constants_1 = require("../constants");
const ecpair_1 = require("ecpair");
const tinysecp = __importStar(require("tiny-secp256k1"));
const ECPair = (0, ecpair_1.ECPairFactory)(tinysecp);
class ValidationUtils {
    static validateAddress(address, network) {
        try {
            bitcoin.address.toOutputScript(address, network);
            return { isValid: true };
        }
        catch (error) {
            return { isValid: false, error: constants_1.ERROR_MESSAGES.INVALID_ADDRESS };
        }
    }
    static validatePrivateKey(privateKey) {
        try {
            // Attempt to decode WIF
            ECPair.fromWIF(privateKey);
            return { isValid: true };
        }
        catch (error) {
            return { isValid: false, error: constants_1.ERROR_MESSAGES.INVALID_PRIVATE_KEY };
        }
    }
    static validateAmount(amount) {
        if (amount <= 0 || !Number.isInteger(amount)) {
            return { isValid: false, error: constants_1.ERROR_MESSAGES.INVALID_AMOUNT };
        }
        return { isValid: true };
    }
    static validateFeeRate(feeRate) {
        if (feeRate <= 0) {
            return { isValid: false, error: constants_1.ERROR_MESSAGES.INVALID_FEE_RATE };
        }
        return { isValid: true };
    }
    static validateStampData(stampData) {
        if (!stampData.content || !stampData.contentType) {
            return { isValid: false, error: constants_1.ERROR_MESSAGES.INVALID_STAMP_DATA };
        }
        return { isValid: true };
    }
    static validateRuneTransfer(runeId, amount) {
        if (!runeId || amount <= 0) {
            return { isValid: false, error: 'INVALID RUNE DATA' };
        }
        return { isValid: true };
    }
}
exports.ValidationUtils = ValidationUtils;
