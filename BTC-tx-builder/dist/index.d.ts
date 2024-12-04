import { BTCTransactionBuilder } from './builder/BTCTransactionBuilder';
import { RuneTransactionBuilder } from './builder/RuneTransactionBuilder';
import { StampTransactionBuilder } from './builder/StampTransactionBuilder';
import { NetworkConfig, FeeConfig } from './types';
export declare class TransactionBuilder {
    private btcBuilder;
    private runeBuilder;
    private stampBuilder;
    constructor(config: NetworkConfig, feeConfig: FeeConfig);
    getBTCBuilder(): BTCTransactionBuilder;
    getRuneBuilder(): RuneTransactionBuilder;
    getStampBuilder(): StampTransactionBuilder;
}
export * from './types';
export * from './constants';
