"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMSigner = void 0;
const ethers_1 = require("ethers");
class EVMSigner {
    constructor(provider) {
        this.provider = provider;
    }
    async signWithPrivateKey(unsignedTx, privateKey) {
        try {
            const wallet = new ethers_1.Wallet(privateKey, this.provider);
            const signedTx = await wallet.signTransaction(unsignedTx);
            return signedTx;
        }
        catch (error) {
            throw new Error(`Signing error: ${error.message}`);
        }
    }
    async signMessage(message, privateKey) {
        try {
            const wallet = new ethers_1.Wallet(privateKey, this.provider);
            const signature = await wallet.signMessage(message);
            return signature;
        }
        catch (error) {
            throw new Error(`Message signing error: ${error.message}`);
        }
    }
}
exports.EVMSigner = EVMSigner;
