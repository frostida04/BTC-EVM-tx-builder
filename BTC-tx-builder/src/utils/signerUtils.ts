import { Signer } from 'bitcoinjs-lib';
import { ECPairInterface } from 'ecpair';

export function convertToSigner(ecpair: ECPairInterface): Signer {
    return {
        publicKey: Buffer.from(ecpair.publicKey),
        sign(hash: Buffer): Buffer {
            const sig = ecpair.sign(hash);
            return Buffer.from(sig);
        }
    };
}