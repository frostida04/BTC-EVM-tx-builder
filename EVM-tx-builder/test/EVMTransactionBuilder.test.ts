import { EVMTransactionBuilder, FeeConfig } from '../src/';

// Example usage
async function main() {
    const feeConfig: FeeConfig = {
        feePercentage: 0.5, // 0.5%
        flatFeeGwei: "1000000000", // 1 Gwei
        feeCollector: "0xFeeCollectorAddress"
    };

    const builder = new EVMTransactionBuilder(
        "YOUR_RPC_URL",
        1, // chainId
        feeConfig
    );

    // Example: Native transfer with fee
    const nativeTransferResult = await builder.buildNativeTransfer(
        "0xSenderAddress",
        "0xRecipientAddress",
        "1.0", // 1 ETH
        "privateKey"
    );

    // Submit both main transaction and fee transaction
    const { mainTxHash, feeTxHash } = await builder.submitTransactionWithFee(nativeTransferResult);
    console.log("Main transaction hash:", mainTxHash);
    console.log("Fee transaction hash:", feeTxHash);
    console.log("Fee amount:", nativeTransferResult.feeAmount);

    // Example: NFT transfer with flat fee
    const nftTransferResult = await builder.buildERC721Transfer(
        "0xSenderAddress",
        "0xRecipientAddress",
        "1", // tokenId
        "0xNFTContractAddress",
        "privateKey",
        { safe: true }
    );

    // Submit both NFT transfer and fee transaction
    const nftTxResult = await builder.submitTransactionWithFee(nftTransferResult);
    console.log("NFT transaction hash:", nftTxResult.mainTxHash);
    console.log("Fee transaction hash:", nftTxResult.feeTxHash);
    console.log("Flat fee amount:", nftTransferResult.feeAmount);
}
