import { FeeConfig, FeeCalculation } from '../types';
export declare class FeeManager {
    private config;
    constructor(config: FeeConfig);
    private validateFeeConfig;
    calculateNativeFee(amount: number): FeeCalculation;
    calculateFlatFee(): FeeCalculation;
    getFeeCollector(): string;
    getpercentageFee(): number;
    getflatFee(): number;
}
