import { Contract } from 'web3-eth-contract';

export const getRate = async (contractRate: Contract) => {
    const result = await contractRate.methods
        .getReserves()
        .call()
        .then((values: any) => {
            return {
                usdc: values[0] / 10 ** 6,
                jpyc: values[1] / 10 ** 18
            };
        })

    const rateRaw = result.jpyc / result.usdc;

    return {
        rate: Math.floor(rateRaw * Math.pow(10, 2)) / Math.pow(10, 2),
        rateRaw,
        ...result
    };
}