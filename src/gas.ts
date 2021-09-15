import axios from 'axios';

type Result = {
    data: {
        fast: number,
        fastest: number
    }
};

export const getGas = async () => {
    let result = {
        data: {
            fastest: 100,
            fast: 30
        }
    };

    try {
        result = await axios.get('https://gasstation-mainnet.matic.network') as Result;
    } catch (error) {
        console.log(error);
        console.log(`[JPYCStabilizer] getGas Error!`);
    }

    return result.data;
}