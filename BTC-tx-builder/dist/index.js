"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionBuilder = void 0;
const BTCTransactionBuilder_1 = require("./builder/BTCTransactionBuilder");
const RuneTransactionBuilder_1 = require("./builder/RuneTransactionBuilder");
const StampTransactionBuilder_1 = require("./builder/StampTransactionBuilder");
class TransactionBuilder {
    constructor(config, feeConfig) {
        this.btcBuilder = new BTCTransactionBuilder_1.BTCTransactionBuilder(config, feeConfig);
        this.runeBuilder = new RuneTransactionBuilder_1.RuneTransactionBuilder(config, feeConfig);
        this.stampBuilder = new StampTransactionBuilder_1.StampTransactionBuilder(config, feeConfig);
    }
    getBTCBuilder() {
        return this.btcBuilder;
    }
    getRuneBuilder() {
        return this.runeBuilder;
    }
    getStampBuilder() {
        return this.stampBuilder;
    }
}
exports.TransactionBuilder = TransactionBuilder;
__exportStar(require("./types"), exports);
__exportStar(require("./constants"), exports);
