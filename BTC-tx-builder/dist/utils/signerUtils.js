"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToSigner = convertToSigner;
function convertToSigner(ecpair) {
    return {
        publicKey: Buffer.from(ecpair.publicKey),
        sign(hash) {
            const sig = ecpair.sign(hash);
            return Buffer.from(sig);
        }
    };
}
