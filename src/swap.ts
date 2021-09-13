import Common from "@ethereumjs/common";
import { Transaction } from "@ethereumjs/tx";
import Web3 from "web3";
import { Contract } from 'web3-eth-contract';
import Account from "./account";

type Decimals = {
    [tokenName: string]: number;
};

const decimals: Decimals = {
    JPYC: 18,
    USDC: 6
};

export const goSwap = async (
    web3: Web3,
    account: Account,
    swapContract: Contract,
    from: string, 
    to: string, 
    amount: number, 
    minAmount: number, 
    gas: number,
    common: Common
) => {
    const timestamp = new Date();

    const amountInValue = Math.floor(amount * 10 ** decimals[from]) / 10 ** decimals[from];
    const amountIn = 
        from === "JPYC"
            ? web3.utils.toWei(amountInValue.toString())
            : web3.utils.toWei(amountInValue.toString(), 'mwei');

    const amountOutValue = Math.floor(minAmount * 10 ** decimals[to]) / 10 ** decimals[to];
    const amountOut =
        to === "JPYC"
            ? web3.utils.toWei(amountOutValue.toString())
            : web3.utils.toWei(amountOutValue.toString(), 'mwei');

    const tokenIn = account.getContractAddress(from);
    const tokenOut = account.getContractAddress(to);

    try {
        const swapData = swapContract.methods
            .swapExactTokensForTokens(
                web3.utils.toHex(amountIn),
                web3.utils.toHex(amountOut),
                [tokenIn, tokenOut],
                account.getAddress(),
                Math.floor(Date.now() / 1000) + 60 * 5
            )
            .encodeABI();

        const nonce = await web3.eth.getTransactionCount(account.getAddress(), 'pending');

        const details = {
            nonce: web3.utils.toHex(nonce),
            to: account.getContractAddress('ROUTER'),
            from: account.getAddress(),
            gasPrice: web3.utils.toHex(gas * 1e9),
            gasLimit: web3.utils.toHex(100000 * 30),
            data: swapData,
            chainId: 137
        };

        const transaction = new Transaction(details, { common: common });
        const signedTx = transaction.sign(Buffer.from(process.env.MY_PRIVATE_KEY, 'hex'));
        const serializedTx = signedTx.serialize();

        await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
            .once('transactionHash', (hash: string) => {
                console.log(`${timestamp} [JPYCStabilizer] Swaping TXID: ${hash}`);
            })
            .once('receipt', () => {
                console.log(`${timestamp} [JPYCStabilizer] Success Swap!`);
            });
    } catch (error) {
        console.log(error);
        console.log(`${timestamp} [JPYCStabilizer] Error Swap!`)
    } 
}