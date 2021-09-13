import Common from '@ethereumjs/common';
import { Transaction } from '@ethereumjs/tx';
import { exit } from 'process';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { abi, abiERC20, abiUniswapV2Router } from './abis';

type Contracts = {
    [name: string]: {
        address: string,
        instance: Contract | null
    }
};

type Balance = {
    [name: string]: string
};

export default class Account {
    private web3: Web3;

    private contracts: Contracts = {
        JPYC: {
            address: '0x6ae7dfc73e0dde2aa99ac063dcf7e8a63265108c',
            instance: null
        },
        USDC: {
            address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            instance: null
        },
        ROUTER: {
            address: '0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff',
            instance: null
        },
        JPYC_USDC_RATE: {
            address: '0x205995421C72Dc223F36BbFad78B66EEa72d2677',
            instance: null
        }
    };

    public balance: Balance = {
        matic: "",
        usdc: "",
        jpyc: ""
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

        this.contracts.JPYC.instance = new this.web3.eth.Contract(
            abiERC20,
            this.contracts.JPYC.address
        );

        this.contracts.USDC.instance = new this.web3.eth.Contract(
            abiERC20,
            this.contracts.USDC.address
        );

        this.contracts.JPYC_USDC_RATE.instance = new this.web3.eth.Contract(
            abi,
            this.contracts.JPYC_USDC_RATE.address
        )

        this.contracts.ROUTER.instance = new this.web3.eth.Contract(
            abiUniswapV2Router,
            this.contracts.ROUTER.address
        )
    }

    public init() {
        const account = this.web3.eth.accounts.privateKeyToAccount(process.env.MY_PRIVATE_KEY);
        
        this.web3.eth.accounts.wallet.add(account);
        
        console.log(`[JPYCStabilizer] Success import account from privkey!`);
        console.log(`[JPYCStabilizer] Your address: ${this.web3.eth.accounts.wallet[0].address}`); 
    }

    public getWeb3() {
        return this.web3;
    }

    public getAddress() {
        return this.web3.eth.accounts.wallet[0].address;
    }

    public getContract(tokenName: string) {
        const contract = this.contracts[tokenName].instance;

        if (!contract) exit();

        return contract;
    }

    public getContractAddress(tokenName: string) {
        const contract = this.contracts[tokenName].address;

        if (!contract) exit();

        return contract;
    }

    public async getBalance() {
        if (!this.contracts.JPYC.instance || !this.contracts.USDC.instance) return;
        
        this.balance.matic = await this.web3.eth.getBalance(this.getAddress());

        this.balance.jpyc = await this.contracts.JPYC.instance.methods
            .balanceOf(this.getAddress())
            .call();
        
        this.balance.usdc = await this.contracts.USDC.instance.methods
            .balanceOf(this.getAddress())
            .call();

        return this.balance;
    }

    public async approveCoin(tokenName: string, common: Common) {
        console.log(`[JPYCStabilizer] Try approving ${tokenName}`);

        const tokenContract = this.contracts[tokenName].instance;

        if (!tokenContract) return;

        const tokenDecimals = tokenName === 'JPYC' ? this.web3.utils.toBN(18) : this.web3.utils.toBN(6);
        const tokenAmountToApprove = this.web3.utils.toBN(999000000000);
        const approveValue = this.web3.utils.toHex(
            tokenAmountToApprove.mul(this.web3.utils.toBN(10).pow(tokenDecimals))
        );

        const approveToken = tokenContract.methods.approve(this.getContractAddress('ROUTER'), approveValue).encodeABI();

        const nonce = await this.web3.eth.getTransactionCount(this.getAddress(), 'pending');

        const details = {
            nonce: this.web3.utils.toHex(nonce),
            to: this.contracts[tokenName].address,
            from: this.getAddress(),
            gasPrice: this.web3.utils.toHex(10 * 1e9),
            gasLimit: this.web3.utils.toHex(100000),
            data: approveToken,
            chainId: 137,
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