import axios from 'axios';

type Result = {
    data: {
        fastest: number
    }
};

export const getGas = async () => {
    let result = {
        data: {
            fastest: 100
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