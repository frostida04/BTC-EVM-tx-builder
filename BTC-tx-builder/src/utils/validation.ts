import * as bitcoin from 'bitcoinjs-lib';
import { ValidationResult, StampInscription } from '../types';
import { ERROR_MESSAGES } from '../constants';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';

const ECPair = ECPairFactory(tinysecp);


export class ValidationUtils {
    static validateAddress(address: string, network?: bitcoin.Network): ValidationResult {
        try {
            bitcoin.address.toOutputScript(address, network);
            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: ERROR_MESSAGES.INVALID_ADDRESS };
        }
    }

    static validatePrivateKey(privateKey: string): ValidationResult {
        try {
            // Attempt to decode WIF
            ECPair.fromWIF(privateKey);
            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: ERROR_MESSAGES.INVALID_PRIVATE_KEY };
        }
    }

    static validateAmount(amount: number): ValidationResult {
        if (amount <= 0 || !Number.isInteger(amount)) {
            return { isValid: false, error: ERROR_MESSAGES.INVALID_AMOUNT };
        }
        return { isValid: true };
    }

    static validateFeeRate(feeRate: number): ValidationResult {
        if (feeRate <= 0) {
            return { isValid: false, error: ERROR_MESSAGES.INVALID_FEE_RATE };
        }
        return { isValid: true };
    }

    static validateStampData(stampData: StampInscription): ValidationResult {
        if (!stampData.content || !stampData.contentType) {
            return { isValid: false, error: ERROR_MESSAGES.INVALID_STAMP_DATA };
        }
        return { isValid: true };
    }

    static validateRuneTransfer(runeId: string, amount: number): ValidationResult {
        if (!runeId || amount <= 0) {
            return { isValid: false, error: 'INVALID RUNE DATA' };
        }
        return { isValid: true };
    }
}
