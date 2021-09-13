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

    console.log(`[JPYCStabilizer] ${rateData.rate} USDC/JPYC`)

    if (!balance) return;

    if (
        rateData.rate > 118.0 &&
        parseFloat(web3.utils.fromWei(balance.usdc, 'mwei')) > 1
    ) {
        if (!flagSwapping) {
            flagSwapping = true;
            console.log(`[JPYCStabilizer] USDC -> JPYC Swapping Start!`);

            const bl = parseFloat(web3.utils.fromWei(balance.usdc, 'mwei')) * 0.99999;
            const amount = bl > 200 ? 200 : bl;
            const minAmount = amount * rateData.rate * (1.0 - 0.006);
            
            await goSwap(
                web3,
                account,
                account.getContract('ROUTER'),
                "USDC",
                "JPYC",
                amount,
                minAmount,
                gas < 500 ? gas : 500,
                common
            );

            flagSwapping = false;
        }
    } else if (
        rateData.rate < 116.0 &&
        parseFloat(web3.utils.fromWei(balance.jpyc)) > 100
    ) {
        if (!flagSwapping) {
            flagSwapping = true;
            console.log(`[JPYCStabilizer] JPYC -> USDC Swapping Start!`);

            const bl = parseFloat(web3.utils.fromWei(balance.jpyc)) * 0.99999;
            const amount = bl > 20000 ? 20000 : bl;
            const minAmount = (amount / rateData.rate) * (1.0 - 0.006);
            
            await goSwap(
                web3,
                account,
                account.getContract('ROUTER'),
                "USDC",
                "JPYC",
                amount,
                minAmount,
                gas < 500 ? gas : 500,
                common
            );

            flagSwapping = false;
        }
    }
}

main();