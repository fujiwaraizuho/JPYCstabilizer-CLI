import axios from 'axios';
import { Contract } from 'web3-eth-contract';
import Account from './account';

export const getRate = async (account: Account) => {
    const rates = [];
    

    for (let i in account.markets) {
        const contractPair = account.getPairContract(account.markets[i]);

        if (!contractPair.instance) throw Error();

        const result = await contractPair.instance.methods
            .getReserves()
            .call()
            .then((values: any) => {
                return {
                    usdc: values[0] / 10 ** 6,
                    jpyc: values[1] / 10 ** 18
                };
            });

        const rateRaw = result.jpyc / result.usdc;
        const rate = Math.floor(rateRaw * Math.pow(10, 2)) / Math.pow(10, 2);

        rates.push({
            rate: rate,
            jpyc: result.jpyc,
            usdc: result.usdc
        });
    }

    return rates;
}

export const getJPYUSDRate = async () => {
    const spread = 2;

    /*
    const result = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy%2Cusd"
    );

    const jpyusd = parseInt(result.data.bitcoin.jpy) / parseInt(result.data.bitcoin.usd);

    const deviateTorelance = 
        Math.max(0, Date.parse("2099-12-31T23:23:59.000Z") - Date.now()) /
        (Date.parse("2099-12-31T23:23:59.000Z") - Date.parse("2021-09-14T10:00:00.000Z"));
    */

    const targetRate = 116.7 + Math.random() * 0.1;
    // (1 + deviateTorelance * (nuko.theDayOfNukoRateDeviate - 1)) * jpyusd;

    return {
        target: targetRate,
        upper: targetRate + spread / 2,
        lower: targetRate - spread / 2
    };
}