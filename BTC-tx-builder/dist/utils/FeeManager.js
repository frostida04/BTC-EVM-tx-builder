"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeManager = void 0;
const constants_1 = require("../constants");
const validation_1 = require("./validation");
class FeeManager {
    constructor(config) {
        this.validateFeeConfig(config);
        this.config = config;
    }
    validateFeeConfig(config) {
        if (config.percentageFee < constants_1.FEE_CONSTANTS.MIN_PERCENTAGE ||
            config.percentageFee > constants_1.FEE_CONSTANTS.MAX_PERCENTAGE) {
            throw new Error(constants_1.ERROR_MESSAGES.INVALID_FEE_CONFIG);
        }
        if (config.flatFee < 0) {
            throw new Error(constants_1.ERROR_MESSAGES.INVALID_FEE_CONFIG);
        }
        validation_1.ValidationUtils.validateAddress(config.feeCollector);
    }
    calculateNativeFee(amount) {
        const feeAmount = Math.floor(amount * (this.config.percentageFee / 100));
        const feeTransactionRequired = feeAmount >= constants_1.DUST_THRESHOLD;
        return {
            originalAmount: amount,
            feeAmount,
            totalAmount: amount + (feeTransactionRequired ? feeAmount : 0),
            feeTransactionRequired
        };
    }
    calculateFlatFee() {
        const feeTransactionRequired = this.config.flatFee >= constants_1.DUST_THRESHOLD;
        return {
            originalAmount: 0,
            feeAmount: this.config.flatFee,
            totalAmount: feeTransactionRequired ? this.config.flatFee : 0,
            feeTransactionRequired
        };
    }
    getFeeCollector() {
        return this.config.feeCollector;
    }
    getpercentageFee() {
        return this.config.percentageFee;
    }
    getflatFee() {
        return this.config.flatFee;
    }
}
exports.FeeManager = FeeManager;
