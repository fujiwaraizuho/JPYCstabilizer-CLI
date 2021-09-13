import axios from 'axios';

type Response = {
    fastest: number
};

export const getGas = async () => {
    const response = await axios.get('https://gasstation-mainnet.matic.network');

    return response.data as Response;
}