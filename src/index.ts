import Common from '@ethereumjs/common';
import dotenv from 'dotenv';
import Account from './account';
import { getJPYUSDRate, getRate } from './rate';
import { getGas } from './gas';
import { goSwap } from './swap';
import { exit } from 'process';

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

let data = {
    upper: 117.9,
    lower: 115.9,
    slippage: [
        0.006, 0.0075
    ]
};

const main = async () => {
    const account = new Account();

    // await account.approveCoin('JPYC', common);
    // await account.approveCoin('USDC', common);

    account.getBalance(true);


    gas = (await getGas()).fastest;

    setInterval(async () => {
        const gasData = await getGas();
        gas = gasData.fastest + gasData.fast / 2;
    }, 1500);

    setInterval(async () => {
        await watchRate(account);
    }, 3000);
}

const watchRate = async (account: Account) => {
    const slippages = await getJPYUSDRate();

    data.upper = slippages.upper;
    data.lower = slippages.lower;
    
    const web3 = account.getWeb3();

    const balance = await account.getBalance();
    const rates = await getRate(account);

    console.log(`[${Date.now()}][JPYCStabilizer] ${rates[0].rate} USDC-JPYC by QUICK`);
    console.log(`[${Date.now()}][JPYCStabilizer] ${rates[1].rate} USDC-JPYC by SUSHI`);

    
    let array = [0, 1];

    if (Math.random() > 0.5) {
        array = array.reverse();
    }

    array.forEach(async (i) => {
        if (rates[i].rate > data.upper &&
            parseFloat(web3.utils.fromWei(balance.USDC, 'mwei')) > 1
        ) {
            if (!flagSwapping) {
                flagSwapping = true;

                console.log(`[JPYCStabilizer] USDC -> JPYC Swap by ${account.markets[i]}`);
                
                const bl = parseFloat(web3.utils.fromWei(balance.USDC, 'mwei')) * 0.99999;
                const amount = bl > 200 ? 200 : bl;
                const minAmount = amount * rates[i].rate * (1.0 - data.slippage[i]);

                await goSwap(
                    web3,
                    account,
                    i,
                    "USDC",
                    "JPYC",
                    amount,
                    minAmount,
                    gas < 300 ? gas : 300,
                    common
                );


                flagSwapping = false;
            }
        } else if (
            rates[i].rate < data.lower &&
            parseFloat(web3.utils.fromWei(balance.JPYC)) > 100
        ) {
            if (!flagSwapping) {
                flagSwapping = true;

                console.log(`[JPYCStabilizer] JPYC -> USDC Swap by ${account.markets[i]}`);
                
                const bl = parseFloat(web3.utils.fromWei(balance.JPYC)) * 0.99999;
                const amount = bl > 20000 ? 20000 : bl;
                const minAmont = (amount / rates[i].rate) * (1.0 - data.slippage[i]);

                await goSwap(
                    web3,
                    account,
                    i,
                    "JPYC",
                    "USDC",
                    amount,
                    minAmont,
                    gas < 300 ? gas : 300,
                    common
                );

                flagSwapping = false;
            }
        }
    })
}

main();