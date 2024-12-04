import * as bitcoin from 'bitcoinjs-lib';
import { ValidationResult, StampInscription } from '../types';
export declare class ValidationUtils {
    static validateAddress(address: string, network?: bitcoin.Network): ValidationResult;
    static validatePrivateKey(privateKey: string): ValidationResult;
    static validateAmount(amount: number): ValidationResult;
    static validateFeeRate(feeRate: number): ValidationResult;
    static validateStampData(stampData: StampInscription): ValidationResult;
    static validateRuneTransfer(runeId: string, amount: number): ValidationResult;
}
