import { Network } from 'bitcoinjs-lib';
export interface NetworkConfig {
    network: 'mainnet' | 'testnet';
    apiBaseUrl: string;
}
export interface FeeConfig {
    feeCollector: string;
    percentageFee: number;
    flatFee: number;
    minFee: number;
    maxFee: number;
}
export interface FeeCalculation {
    originalAmount: number;
    feeAmount: number;
    totalAmount: number;
    feeTransactionRequired: boolean;
}
export interface UTXO {
    txid: string;
    vout: number;
    value: number;
    scriptPubKey: string;
    isInscription?: boolean;
    isRune?: boolean;
    runeId?: string;
}
export interface TransactionResult {
    txHex: string;
    txId: string;
    fee: number;
    protocolFee: number;
    totalFee: number;
    runeTransfer?: RuneTransfer;
    stampInscription?: StampInscription;
    swapDetails?: SwapDetails;
    claimDetails?: ClaimDetails;
}
export interface RuneTransfer {
    symbol: string;
    amount: number;
    sender: string;
    recipient: string;
    runeId: string;
    destinationAddress: string;
}
export interface StampInscription {
    contentType: string;
    content: string;
    stampId?: string;
}
export interface CrossChainSwap {
    hash: string;
    amount: number;
    recipientAddress: string;
}
export interface SwapDetails {
    hash: string;
    amount: number;
    sender: string;
    recipient: string;
    role: SwapRole;
    htlcAddress: string;
}
export interface ClaimDetails {
    htlcAddress: string;
    preimage: string;
    amount: number;
    recipient: string;
}
export declare enum SwapRole {
    INITIATOR = "initiator",
    PARTICIPANT = "participant"
}
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}
export interface FeeRates {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
}
export interface NetworkUtilsConfig {
    apiBaseUrl: string;
    network: Network;
}
export interface RuneInfo {
    symbol: string;
    supply: number;
    limit: number;
    decimals: number;
    creator: string;
}
export interface RuneBalance {
    symbol: string;
    amount: number;
    spendable: number;
}
export interface TransactionInput {
    txid: string;
    vout: number;
    scriptSig: string;
    sequence: number;
    witness: string[];
}
export interface TransactionOutput {
    value: number;
    scriptPubKey: string;
}
export interface Transaction {
    txid: string;
    hash: string;
    version: number;
    size: number;
    vsize: number;
    weight: number;
    locktime: number;
    vin: TransactionInput[];
    vout: TransactionOutput[];
    hex: string;
}
export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface BlockchainInfo {
    chain: string;
    blocks: number;
    headers: number;
    bestblockhash: string;
    difficulty: number;
    mediantime: number;
    verificationprogress: number;
    initialblockdownload: boolean;
    chainwork: string;
    size_on_disk: number;
    pruned: boolean;
}
export interface MempoolInfo {
    loaded: boolean;
    size: number;
    bytes: number;
    usage: number;
    maxmempool: number;
    mempoolminfee: number;
    minrelaytxfee: number;
}
