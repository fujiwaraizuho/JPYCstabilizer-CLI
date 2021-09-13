import Common from '@ethereumjs/common';
import dotenv from 'dotenv';
import Account from './account';
import { getRate } from './rate';
import { getGas } from './gas';
import { goSwap } from './swap';


dotenv.config();

const common = Common.custom(
    {
        name: 'Polygon',
        chainId: 137
    },
    {
        hardfork: 'petersburg'
    }
);

let gas = 0;

let flagSwapping = false;

const main = async () => {
    const account = new Account();
    account.init();

    await account.approveCoin('JPYC', common);
    await account.approveCoin('USDC', common);

    gas = (await getGas()).fastest;  
    setInterval(async () => {
        gas = (await getGas()).fastest;
    }, 1500);

    setInterval(async () => {
        await watchRate(account);
    }, 3000);
}

const watchRate = async (account: Account) => {
    const web3 = account.getWeb3();
    const balance = await account.getBalance();
    const rateData = await getRate(account.getContract('JPYC_USDC_RATE'));

    console.log(`[JPYCStabilizer] ${rateData.rate} USDC/JPYC`);

    if (!balance) return;

    const maxGas = parseFloat(process.env.SWAP_GAS_MAX);

    if (
        rateData.rate > parseFloat(process.env.UPPER_THRESHOLD) &&
        parseFloat(web3.utils.fromWei(balance.usdc, 'mwei')) > 1
    ) {
        if (!flagSwapping) {
            flagSwapping = true;
            console.log(`[JPYCStabilizer] USDC -> JPYC Swap!`);

            const bl = parseFloat(web3.utils.fromWei(balance.usdc, 'mwei')) * 0.99999;
            const amount = bl > 400 ? 400 : bl;
            const minAmount = amount * rateData.rate * (1.0 - parseFloat(process.env.SWAP_SLIPPAGE));
            
            await goSwap(
                web3,
                account,
                account.getContract('ROUTER'),
                "USDC",
                "JPYC",
                amount,
                minAmount,
                gas < maxGas ? gas : maxGas,
                common
            );

            flagSwapping = false;
        }
    } else if (
        rateData.rate < parseFloat(process.env.LOWER_THRESHOLD) &&
        parseFloat(web3.utils.fromWei(balance.jpyc)) > 100
    ) {
        if (!flagSwapping) {
            flagSwapping = true;
            console.log(`[JPYCStabilizer] JPYC -> USDC Swap!`);

            const bl = parseFloat(web3.utils.fromWei(balance.jpyc)) * 0.99999;
            const amount = bl > 40000 ? 40000 : bl;
            const minAmount = (amount / rateData.rate) * (1.0 - parseFloat(process.env.SWAP_SLIPPAGE));
            
            await goSwap(
                web3,
                account,
                account.getContract('ROUTER'),
                "USDC",
                "JPYC",
                amount,
                minAmount,
                gas < maxGas ? gas : maxGas,
                common
            );

            flagSwapping = false;
        }
    }
}

main();