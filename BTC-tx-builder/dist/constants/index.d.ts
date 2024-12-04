export declare const DUST_THRESHOLD = 546;
export declare const DEFAULT_FEE_RATE = 5;
export declare const FEE_CONSTANTS: {
    MIN_PERCENTAGE: number;
    MAX_PERCENTAGE: number;
    DEFAULT_PERCENTAGE: number;
    DEFAULT_FLAT_FEE: number;
    MIN_FEE_AMOUNT: number;
};
export declare const PROTOCOL_IDS: {
    STAMP: string;
    XCP: string;
    RUNE: string;
};
export declare const ERROR_MESSAGES: {
    INVALID_ADDRESS: string;
    INVALID_NETWORK: string;
    INVALID_AMOUNT: string;
    INVALID_FEE_RATE: string;
    INVALID_PRIVATE_KEY: string;
    NO_UTXOS: string;
    INSUFFICIENT_FUNDS: string;
    INVALID_RUNE_SYMBOL: string;
    INVALID_RUNE_AMOUNT: string;
    INVALID_RUNE_LIMIT: string;
    RUNE_NOT_FOUND: string;
    INSUFFICIENT_RUNE_BALANCE: string;
    INVALID_STAMP_DATA: string;
    INVALID_CONTENT_TYPE: string;
    CONTENT_TOO_LARGE: string;
    INVALID_FEE_CONFIG: string;
    NETWORK_ERROR: string;
    BROADCAST_FAILED: string;
    INVALID_RUNE_DATA: string;
};
export declare const TIMELOCK_BLOCKS: {
    INITIATOR: number;
    PARTICIPANT: number;
};
export declare const PROTOCOL_CONSTANTS: {
    MAX_RUNE_SYMBOL_LENGTH: number;
    MAX_STAMP_CONTENT_SIZE: number;
    MIN_FEE_RATE: number;
    MAX_FEE_RATE: number;
    DEFAULT_FEE_RATE: number;
};
export declare const CONTENT_TYPES: {
    TEXT: string;
    JSON: string;
    SVG: string;
    PNG: string;
    JPEG: string;
    GIF: string;
};
export declare const API_ENDPOINTS: {
    MAINNET: {
        MEMPOOL: string;
        BLOCKSTREAM: string;
    };
    TESTNET: {
        MEMPOOL: string;
        BLOCKSTREAM: string;
    };
};
