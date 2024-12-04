"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ENDPOINTS = exports.CONTENT_TYPES = exports.PROTOCOL_CONSTANTS = exports.TIMELOCK_BLOCKS = exports.ERROR_MESSAGES = exports.PROTOCOL_IDS = exports.FEE_CONSTANTS = exports.DEFAULT_FEE_RATE = exports.DUST_THRESHOLD = void 0;
exports.DUST_THRESHOLD = 546;
exports.DEFAULT_FEE_RATE = 5;
exports.FEE_CONSTANTS = {
    MIN_PERCENTAGE: 0,
    MAX_PERCENTAGE: 100,
    DEFAULT_PERCENTAGE: 0.5,
    DEFAULT_FLAT_FEE: 10000, // 10000 sats
    MIN_FEE_AMOUNT: 546, // Dust limit
};
exports.PROTOCOL_IDS = {
    STAMP: 'STAMP',
    XCP: 'COUNTERPARTY',
    RUNE: 'RUNE'
};
exports.ERROR_MESSAGES = {
    // General errors
    INVALID_ADDRESS: 'Invalid Bitcoin address',
    INVALID_NETWORK: 'Invalid network type',
    INVALID_AMOUNT: 'Invalid amount',
    INVALID_FEE_RATE: 'Invalid fee rate',
    INVALID_PRIVATE_KEY: 'Invalid private key',
    NO_UTXOS: 'No available UTXOs found',
    INSUFFICIENT_FUNDS: 'Insufficient funds',
    // Rune specific errors
    INVALID_RUNE_SYMBOL: 'Invalid rune symbol',
    INVALID_RUNE_AMOUNT: 'Invalid rune amount',
    INVALID_RUNE_LIMIT: 'Invalid rune limit',
    RUNE_NOT_FOUND: 'Rune not found',
    INSUFFICIENT_RUNE_BALANCE: 'Insufficient rune balance',
    // Stamp specific errors
    INVALID_STAMP_DATA: 'Invalid stamp data',
    INVALID_CONTENT_TYPE: 'Invalid content type',
    CONTENT_TOO_LARGE: 'Content size exceeds maximum limit',
    INVALID_FEE_CONFIG: 'Invalid fee configuration',
    NETWORK_ERROR: 'Network error occurred',
    BROADCAST_FAILED: 'Transaction broadcast failed',
    INVALID_RUNE_DATA: 'Invalid rune data'
};
exports.TIMELOCK_BLOCKS = {
    INITIATOR: 144, // 24 hours (assuming 10-minute blocks)
    PARTICIPANT: 72 // 12 hours (assuming 10-minute blocks)
};
exports.PROTOCOL_CONSTANTS = {
    MAX_RUNE_SYMBOL_LENGTH: 32,
    MAX_STAMP_CONTENT_SIZE: 1024 * 400, // 400KB
    MIN_FEE_RATE: 1,
    MAX_FEE_RATE: 500,
    DEFAULT_FEE_RATE: 10
};
exports.CONTENT_TYPES = {
    TEXT: 'text/plain',
    JSON: 'application/json',
    SVG: 'image/svg+xml',
    PNG: 'image/png',
    JPEG: 'image/jpeg',
    GIF: 'image/gif'
};
exports.API_ENDPOINTS = {
    MAINNET: {
        MEMPOOL: 'https://mempool.space/api',
        BLOCKSTREAM: 'https://blockstream.info/api'
    },
    TESTNET: {
        MEMPOOL: 'https://mempool.space/testnet/api',
        BLOCKSTREAM: 'https://blockstream.info/testnet/api'
    }
};
