declare namespace NodeJS {
    interface ProcessEnv {
        readonly NODE_URL: string,
        readonly MY_PRIVATE_KEY: string,
        readonly PASSWORD: string,  
        readonly QUICKSWAP_ROUTER_CONTRACT_ADDRESS: string,
    }
}