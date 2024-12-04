import { BTCTransactionBuilder } from './builder/BTCTransactionBuilder';
import { RuneTransactionBuilder } from './builder/RuneTransactionBuilder';
import { StampTransactionBuilder } from './builder/StampTransactionBuilder';
import { NetworkConfig, FeeConfig } from './types';

export class TransactionBuilder {
    private btcBuilder: BTCTransactionBuilder;
    private runeBuilder: RuneTransactionBuilder;
    private stampBuilder: StampTransactionBuilder;

    constructor(config: NetworkConfig, feeConfig: FeeConfig) {
        this.btcBuilder = new BTCTransactionBuilder(config, feeConfig);
        this.runeBuilder = new RuneTransactionBuilder(config, feeConfig);
        this.stampBuilder = new StampTransactionBuilder(config, feeConfig);
    }

    getBTCBuilder(): BTCTransactionBuilder {
        return this.btcBuilder;
    }

    getRuneBuilder(): RuneTransactionBuilder {
        return this.runeBuilder;
    }

    getStampBuilder(): StampTransactionBuilder {
        return this.stampBuilder;
    }
}

export * from './types';
export * from './constants';
