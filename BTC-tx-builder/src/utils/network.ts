import axios from 'axios';
import { UTXO, FeeRates } from '../types';
import { ERROR_MESSAGES } from '../constants';

export class NetworkUtils {
    private apiBaseUrl: string;

    constructor(apiBaseUrl: string) {
        this.apiBaseUrl = apiBaseUrl;
    }

    async getUTXOs(address: string): Promise<UTXO[]> {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/address/${address}/utxo`);
            return response.data;
        } catch (error) {
            throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}`);
        }
    }

    async getFeeRates(): Promise<FeeRates> {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/fees/recommended`);
            return response.data;
        } catch (error) {
            throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}`);
        }
    }

    async broadcastTransaction(txHex: string): Promise<string> {
        try {
            const response = await axios.post(`${this.apiBaseUrl}/tx`, txHex);
            return response.data.txid;
        } catch (error) {
            throw new Error(`${ERROR_MESSAGES.BROADCAST_FAILED}`);
        }
    }

    async getTransaction(txid: string): Promise<any> {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/tx/${txid}`);
            return response.data;
        } catch (error) {
            throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}`);
        }
    }
}
