import { UTXO, FeeRates } from '../types';
export declare class NetworkUtils {
    private apiBaseUrl;
    constructor(apiBaseUrl: string);
    getUTXOs(address: string): Promise<UTXO[]>;
    getFeeRates(): Promise<FeeRates>;
    broadcastTransaction(txHex: string): Promise<string>;
    getTransaction(txid: string): Promise<any>;
}
