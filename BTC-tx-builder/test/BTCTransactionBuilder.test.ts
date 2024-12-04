import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { BTCTransactionBuilder } from '../src/builder/BTCTransactionBuilder';
import { RuneTransactionBuilder } from '../src/builder/RuneTransactionBuilder';
import { StampTransactionBuilder } from '../src/builder/StampTransactionBuilder';
import { XCPTransactionBuilder } from '../src/builder/XCPTransactionBuilder';
import { NetworkUtils } from '../src/utils/network';
import { 
    UTXO, 
    NetworkConfig, 
    StampData,
    RuneTransfer,
    XCPTransfer,
    InscriptionTransfer
} from '../src/types';
import { 
    DUST_THRESHOLD,
    ERROR_MESSAGES,
    STAMP_CONTENT_TYPES
} from '../src/constants';

// Mock the network utils
jest.mock('../src/utils/network');

const ECPair = ECPairFactory(ecc);

describe('Transaction Builders Test Suite', () => {
    let btcBuilder: BTCTransactionBuilder;
    let runeBuilder: RuneTransactionBuilder;
    let stampBuilder: StampTransactionBuilder;
    let xcpBuilder: XCPTransactionBuilder;
    let mockNetworkUtils: jest.Mocked<NetworkUtils>;
    
    const testConfig: NetworkConfig = {
        network: 'testnet',
        apiBaseUrl: 'https://'
    };

    const testPrivateKey = ECPair.makeRandom({ network: bitcoin.networks.testnet }).toWIF();
    const testFromAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
    const testDestAddress = 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7';

    // Mock UTXO data
    const mockUTXOs: UTXO[] = [
        {
            txid: '',
            vout: 0,
            value: 100000,
            scriptPubKey: '00144b3a9f01d0b01a6e0e118dd53c92e4f10f5024dd',
            isInscription: false
        },
        {
            txid: '',
            vout: 1,
            value: 200000,
            scriptPubKey: '00144b3a9f01d0b01a6e0e118dd53c92e4f10f5024dd',
            isInscription: false
        },
        {
            txid: '',
            vout: 0,
            value: 50000,
            scriptPubKey: '00144b3a9f01d0b01a6e0e118dd53c92e4f10f5024dd',
            isInscription: true,
            inscriptionId: 'test-inscription-id'
        },
        {
            txid: '',
            vout: 0,
            value: 75000,
            scriptPubKey: '00144b3a9f01d0b01a6e0e118dd53c92e4f10f5024dd',
            isRune: true,
            runeId: 'TEST_RUNE'
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        
        btcBuilder = new BTCTransactionBuilder(testConfig);
        runeBuilder = new RuneTransactionBuilder(testConfig);
        stampBuilder = new StampTransactionBuilder(testConfig);
        xcpBuilder = new XCPTransactionBuilder(testConfig);
        
        mockNetworkUtils = NetworkUtils as jest.Mocked<typeof NetworkUtils>;
        
        mockNetworkUtils.getUTXOs.mockResolvedValue(mockUTXOs);
        mockNetworkUtils.getFeeRates.mockResolvedValue({
            fastestFee: 50,
            halfHourFee: 25,
            hourFee: 15
        });
        mockNetworkUtils.broadcastTransaction.mockResolvedValue(
            ''
        );
    });

    describe('BTCTransactionBuilder', () => {
        describe('buildTransaction', () => {
            it('should build a valid BTC transfer transaction', async () => {
                const amount = 50000;

                const result = await btcBuilder.buildTransaction(
                    testFromAddress,
                    testDestAddress,
                    amount,
                    testPrivateKey
                );

                expect(result).toHaveProperty('txHex');
                expect(result).toHaveProperty('txId');
                expect(result).toHaveProperty('fee');
                expect(typeof result.fee).toBe('number');
                expect(result.fee).toBeGreaterThan(0);
            });

            it('should handle insufficient funds', async () => {
                const largeAmount = 1000000000;

                await expect(
                    btcBuilder.buildTransaction(
                        testFromAddress,
                        testDestAddress,
                        largeAmount,
                        testPrivateKey
                    )
                ).rejects.toThrow(ERROR_MESSAGES.INSUFFICIENT_FUNDS);
            });
        });

        describe('buildInscriptionTransfer', () => {
            it('should build a valid inscription transfer transaction', async () => {
                const inscriptionTransfer: InscriptionTransfer = {
                    inscriptionId: 'test-inscription-id',
                    destinationAddress: testDestAddress
                };

                const result = await btcBuilder.buildInscriptionTransfer(
                    testFromAddress,
                    inscriptionTransfer,
                    testPrivateKey
                );

                expect(result).toHaveProperty('txHex');
                expect(result).toHaveProperty('txId');
                expect(result).toHaveProperty('fee');
            });
        });
    });

    describe('RuneTransactionBuilder', () => {
        describe('buildTransaction', () => {
            it('should build a valid RUNE transfer transaction', async () => {
                const runeTransfer: RuneTransfer = {
                    runeId: 'TEST_RUNE',
                    amount: 1,
                    destinationAddress: testDestAddress
                };

                const result = await runeBuilder.buildTransaction(
                    testFromAddress,
                    runeTransfer,
                    testPrivateKey
                );

                expect(result).toHaveProperty('txHex');
                expect(result).toHaveProperty('txId');
                expect(result).toHaveProperty('fee');
                expect(result).toHaveProperty('runeTransfer');
            });

            it('should handle invalid RUNE data', async () => {
                const invalidRuneTransfer: RuneTransfer = {
                    runeId: '',
                    amount: 0,
                    destinationAddress: testDestAddress
                };

                await expect(
                    runeBuilder.buildTransaction(
                        testFromAddress,
                        invalidRuneTransfer,
                        testPrivateKey
                    )
                ).rejects.toThrow();
            });
        });
    });

    describe('StampTransactionBuilder', () => {
        describe('buildStampTransaction', () => {
            it('should build a valid STAMP transaction', async () => {
                const stampData: StampData = {
                    content: 'Test content',
                    contentType: STAMP_CONTENT_TYPES.TEXT
                };

                const result = await stampBuilder.buildStampTransaction(
                    testFromAddress,
                    stampData,
                    testPrivateKey
                );

                expect(result).toHaveProperty('txHex');
                expect(result).toHaveProperty('txId');
                expect(result).toHaveProperty('fee');
                expect(result).toHaveProperty('stampData');
            });

            it('should handle stamp data too large', async () => {
                const largeStampData: StampData = {
                    content: 'x'.repeat(100000),
                    contentType: STAMP_CONTENT_TYPES.TEXT
                };

                await expect(
                    stampBuilder.buildStampTransaction(
                        testFromAddress,
                        largeStampData,
                        testPrivateKey
                    )
                ).rejects.toThrow(ERROR_MESSAGES.STAMP_DATA_TOO_LARGE);
            });
        });
    });

    describe('XCPTransactionBuilder', () => {
        describe('buildXCPTransfer', () => {
            it('should build a valid XCP transfer transaction', async () => {
                const xcpTransfer: XCPTransfer = {
                    asset: 'XCP',
                    amount: 100,
                    destinationAddress: testDestAddress,
                    memo: 'Test transfer'
                };

                const result = await xcpBuilder.buildXCPTransfer(
                    testFromAddress,
                    xcpTransfer,
                    testPrivateKey
                );

                expect(result).toHaveProperty('txHex');
                expect(result).toHaveProperty('txId');
                expect(result).toHaveProperty('fee');
            });

            it('should handle invalid XCP data', async () => {
                const invalidXcpTransfer: XCPTransfer = {
                    asset: '',
                    amount: 0,
                    destinationAddress: testDestAddress
                };

                await expect(
                    xcpBuilder.buildXCPTransfer(
                        testFromAddress,
                        invalidXcpTransfer,
                        testPrivateKey
                    )
                ).rejects.toThrow(ERROR_MESSAGES.INVALID_XCP_DATA);
            });
        });

        describe('buildXCPIssuance', () => {
            it('should build a valid XCP issuance transaction', async () => {
                const result = await xcpBuilder.buildXCPIssuance(
                    testFromAddress,
                    'NEWASSET',
                    1000,
                    'Test asset description',
                    testPrivateKey
                );

                expect(result).toHaveProperty('txHex');
                expect(result).toHaveProperty('txId');
                expect(result).toHaveProperty('fee');
            });

            it('should handle invalid issuance data', async () => {
                await expect(
                    xcpBuilder.buildXCPIssuance(
                        testFromAddress,
                        '',
                        0,
                        '',
                        testPrivateKey
                    )
                ).rejects.toThrow('INVALID ISSUANCE DATA');
            });
        });
    });

    // Common error handling tests
    describe('Common Error Handling', () => {
        const builders = [
            { name: 'BTC', builder: btcBuilder },
            { name: 'RUNE', builder: runeBuilder },
            { name: 'STAMP', builder: stampBuilder },
            { name: 'XCP', builder: xcpBuilder }
        ];

        builders.forEach(({ name, builder }) => {
            describe(`${name} Builder Network Errors`, () => {
                it('should handle UTXO fetch errors', async () => {
                    mockNetworkUtils.getUTXOs.mockRejectedValueOnce(
                        new Error('Network error')
                    );

                    // Test basic transfer for each builder
                    if (name === 'BTC') {
                        await expect(
                            (builder as BTCTransactionBuilder).buildTransaction(
                                testFromAddress,
                                testDestAddress,
                                50000,
                                testPrivateKey
                            )
                        ).rejects.toThrow();
                    }
                });

                it('should handle broadcast errors', async () => {
                    mockNetworkUtils.broadcastTransaction.mockRejectedValueOnce(
                        new Error('Broadcast failed')
                    );

                    if (name === 'BTC') {
                        await expect(
                            (builder as BTCTransactionBuilder).buildTransaction(
                                testFromAddress,
                                testDestAddress,
                                50000,
                                testPrivateKey
                            )
                        ).rejects.toThrow();
                    }
                });
            });
        });
    });

    // Test fee estimation
    describe('Fee Estimation', () => {
        it('should estimate correct fee for BTC transfer', async () => {
            const amount = 50000;
            const result = await btcBuilder.buildTransaction(
                testFromAddress,
                testDestAddress,
                amount,
                testPrivateKey
            );
            expect(result.fee).toBeGreaterThan(0);
            expect(result.fee).toBeLessThan(amount);
        });
    });

    // Test UTXO selection
    describe('UTXO Selection', () => {
        it('should select appropriate UTXOs for BTC transfer', async () => {
            const amount = 150000; // Should require multiple UTXOs
            const result = await btcBuilder.buildTransaction(
                testFromAddress,
                testDestAddress,
                amount,
                testPrivateKey
            );
            
            const tx = bitcoin.Transaction.fromHex(result.txHex);
            expect(tx.ins.length).toBeGreaterThan(1);
        });
    });
});
