import Common from '@ethereumjs/common';
import { Transaction } from '@ethereumjs/tx';
import { exit } from 'process';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { abiRate, abiERC20, abiUniswapV2Router } from './abis';
import { getGas } from './gas';

type Contracts = {
    [name: string]: {
        address: string;
        instance: Contract | null;
    };
};

type Balance = {
    [name: string]: string
};

export default class Account {
    private web3: Web3;

    public markets = [
        "QUICK",
        "SUSHI"
    ];

    private tokenContracts: Contracts = {
        JPYC: {
            address: '0x6ae7dfc73e0dde2aa99ac063dcf7e8a63265108c',
            instance: null
            
        },
        USDC: {
            address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            instance: null
        },
    };

    private routerContracts: Contracts = {
        QUICK: {
            address: '0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff',
            instance: null
        },
        SUSHI: {
            address: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
            instance: null
        },
    };

    private pairContracts: Contracts = {
        QUICK: {
            address: '0x205995421C72Dc223F36BbFad78B66EEa72d2677',
            instance: null
        },
        SUSHI: {
            address: '0xfbae8e2d04a67c10047d83ee9b8aeffe7f6ea3f4',
            instance: null
        },
    };

    public balance: Balance = {
        MATIC: "",
        USDC: "",
        JPYC: ""
    };

    constructor() {
        const provider = new Web3.providers.WebsocketProvider(process.env.NODE_URL, {
            timeout: 30000,
            clientConfig: {
              keepalive: true,
              keepaliveInterval: 60000,
            },
            reconnect: {
              auto: true,
              delay: 1000,
              maxAttempts: 5,
              onTimeout: false,
            },
        });
        
        this.web3 = new Web3(provider);

        this.tokenContracts.JPYC.instance = new this.web3.eth.Contract(
            abiERC20,
            this.tokenContracts.JPYC.address
        );

        this.tokenContracts.USDC.instance = new this.web3.eth.Contract(
            abiERC20,
            this.tokenContracts.USDC.address
        );

        this.markets.map((market) => {
            this.routerContracts[market].instance = new this.web3.eth.Contract(
                abiUniswapV2Router,
                this.routerContracts[market].address
            );

            this.pairContracts[market].instance = new this.web3.eth.Contract(
                abiRate,
                this.pairContracts[market].address
            );
        });

        this.importPrivKey();
    }

    private importPrivKey() {
        const account = this.web3.eth.accounts.privateKeyToAccount(process.env.MY_PRIVATE_KEY);
        
        this.web3.eth.accounts.wallet.add(account);
        
        console.log(`[JPYCStabilizer] Success import account from privkey!`);
        console.log(`[JPYCStabilizer] Your address: ${this.web3.eth.accounts.wallet[0].address}`); 
    }

    public getWeb3() {
        return this.web3;
    }

    public getMyAddress() {
        return this.web3.eth.accounts.wallet[0].address;
    }

    public getTokenContract(tokenName: string) {
        const contract = this.tokenContracts[tokenName];

        if (!contract) exit();

        return contract;
    }

    public getRouterContract(marketName: string) {
        const contract = this.routerContracts[marketName];

        if (!contract) exit();

        return contract;
    }

    public getPairContract(marketName: string) {
        const contract = this.pairContracts[marketName];

        if (!contract) exit();

        return contract;
    }

    public async getBalance(show?: boolean) {
        show = show ?? false;

        const myAddress = this.getMyAddress();

        this.balance.MATIC = await this.web3.eth.getBalance(myAddress);

        this.balance.JPYC = await this.getTokenContract("JPYC").instance?.methods
            .balanceOf(myAddress)
            .call();

        this.balance.USDC = await this.getTokenContract("USDC").instance?.methods
            .balanceOf(myAddress)
            .call();

        if (show) {
            const matic = Math.floor(parseFloat(this.web3.utils.fromWei(this.balance.MATIC)) * Math.pow(10, 4)) / Math.pow(10, 4);
            const jpyc = Math.floor(parseFloat(this.web3.utils.fromWei(this.balance.JPYC)) * Math.pow(10, 2)) / Math.pow(10, 2);
            const usdc = Math.floor(parseFloat(this.web3.utils.fromWei(this.balance.USDC, 'mwei')) * Math.pow(10, 4)) / Math.pow(10, 4);

            console.log(`[JPYCStabilizer] -- Balance --`);
            console.log(`[JPYCStabilizer] ${matic} MATIC`);
            console.log(`[JPYCStabilizer] ${jpyc} JPYC`);
            console.log(`[JPYCStabilizer] ${usdc} USDC`);
        }

        return this.balance;
    }

    public async approveCoin(tokenName: string, common: Common) {
        console.log(`[JPYCStabilizer] Try approving ${tokenName}`);

        const tokenContract = this.getTokenContract(tokenName).instance;

        const tokenDecimals = this.web3.utils.toBN(18);
        const tokenAmountToApprove = this.web3.utils.toBN(999000000000);
        const approveValue = this.web3.utils.toHex(
            tokenAmountToApprove.mul(this.web3.utils.toBN(10).pow(tokenDecimals))
        );
        
        for (const i in this.markets) {
            console.log(`[JPYCStabilizer] Approve market: ${this.markets[i]}`)

            const approveToken = tokenContract?.methods
                .approve(
                    this.getRouterContract(this.markets[i]).address,
                    approveValue
                ).encodeABI();
            
            const nonce = await this.web3.eth.getTransactionCount(this.getMyAddress(), 'pending');
            const gas = await getGas();
            const details = {
                nonce: this.web3.utils.toHex(nonce),
                to: this.getTokenContract(tokenName).address,
                from: this.getMyAddress(),
                gasPrice: this.web3.utils.toHex(gas.fast * 1e9),
                gasLimit: this.web3.utils.toHex(100000),
                data: approveToken
            };

            const transaction = new Transaction(details, { common: common });
            const signedTx = transaction.sign(Buffer.from(process.env.MY_PRIVATE_KEY, 'hex'));
            const serializedTx = signedTx.serialize();

            await this.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
                .once('transactionHash', (hash: string) => {
                    console.log(`[JPYCStabilizer] Approve TXID: ${hash}`);
                })
                .once('receipt', () => {
                    console.log(`[JPYCStabilizer] Success approve ${tokenName}`);
                });
        }
    }
}