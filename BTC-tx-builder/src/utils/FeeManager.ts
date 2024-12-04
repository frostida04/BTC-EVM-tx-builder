import { FeeConfig, FeeCalculation } from '../types';
import { DUST_THRESHOLD, FEE_CONSTANTS, ERROR_MESSAGES } from '../constants';
import { ValidationUtils } from './validation';

export class FeeManager {
    private config: FeeConfig;

    constructor(config: FeeConfig) {
        this.validateFeeConfig(config);
        this.config = config;
    }

    private validateFeeConfig(config: FeeConfig) {
        if (config.percentageFee < FEE_CONSTANTS.MIN_PERCENTAGE ||
            config.percentageFee > FEE_CONSTANTS.MAX_PERCENTAGE) {
            throw new Error(ERROR_MESSAGES.INVALID_FEE_CONFIG);
        }
        if (config.flatFee < 0) {
            throw new Error(ERROR_MESSAGES.INVALID_FEE_CONFIG);
        }
        ValidationUtils.validateAddress(config.feeCollector);
    }

    calculateNativeFee(amount: number): FeeCalculation {
        const feeAmount = Math.floor(amount * (this.config.percentageFee / 100));
        const feeTransactionRequired = feeAmount >= DUST_THRESHOLD;

        return {
            originalAmount: amount,
            feeAmount,
            totalAmount: amount + (feeTransactionRequired ? feeAmount : 0),
            feeTransactionRequired
        };
    }

    calculateFlatFee(): FeeCalculation {
        const feeTransactionRequired = this.config.flatFee >= DUST_THRESHOLD;

        return {
            originalAmount: 0,
            feeAmount: this.config.flatFee,
            totalAmount: feeTransactionRequired ? this.config.flatFee : 0,
            feeTransactionRequired
        };
    }

    getFeeCollector(): string {
        return this.config.feeCollector;
    }

    getpercentageFee(): number {
        return this.config.percentageFee;
    }

    getflatFee(): number {
        return this.config.flatFee;
    }
}
