import Common from "@ethereumjs/common";
import { Transaction } from "@ethereumjs/tx";
import Web3 from "web3";
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
    i: number,
    from: string, 
    to: string, 
    amount: number, 
    minAmount: number, 
    gas: number,
    common: Common
) => {
    const market = account.markets[i];
    const routerContract = account.getRouterContract(market);
    if (!routerContract.instance || !routerContract.address) throw Error();

    const myAddress = account.getMyAddress();

    const amountInValue = Math.floor(amount * 10 ** decimals[from]) / 10 ** decimals[from];
    const amountIn = (from === "JPYC")
        ? web3.utils.toWei(amountInValue.toString())
        : web3.utils.toWei(amountInValue.toString(), 'mwei');

    const amountOutValue = Math.floor(minAmount * 10 ** decimals[to]) / 10 ** decimals[to];
    const amountOut = (from === "JPYC")
        ? web3.utils.toWei(amountOutValue.toString(), 'mwei')
        : web3.utils.toWei(amountOutValue.toString());

    const tokenIn = account.getTokenContract(from).address;
    const tokenOut = account.getTokenContract(to).address;

    try {
        const swapData = routerContract.instance.methods
            .swapExactTokensForTokens(
                web3.utils.toHex(amountIn),
                web3.utils.toHex(amountOut),
                [tokenIn, tokenOut],
                myAddress,
                Math.floor(Date.now() / 1000) + 60 * 5
            )
            .encodeABI();

        const nonce = await web3.eth.getTransactionCount(myAddress, 'pending');

        const details = {
            nonce: web3.utils.toHex(nonce),
            to: routerContract.address,
            from: myAddress,
            gasPrice: web3.utils.toHex(gas * 1e9),
            gasLimit: web3.utils.toHex(300000),
            data: swapData
        };

        const transaction = new Transaction(details, { common: common });
        const signedTx = transaction.sign(Buffer.from(process.env.MY_PRIVATE_KEY, 'hex'));
        const serializedTx = signedTx.serialize();

        await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
            .once('transactionHash', (hash: string) => {
                console.log(`[JPYCStabilizer] Swap TXID: ${hash}`);
            })
            .once('receipt', () => {
                console.log(`[JPYCStabilizer] Success Swap!`);
            });
    } catch (error) {
        console.log(error);
        console.log(`[JPYCStabilizer] Error Swap!`)
    }
}