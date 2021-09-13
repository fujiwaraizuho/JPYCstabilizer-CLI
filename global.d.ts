declare namespace NodeJS {
    interface ProcessEnv {
        readonly NODE_URL: string,
        readonly SWAP_SLIPPAGE: string,
        readonly SWAP_GAS_MAX: string,
        readonly UPPER_THRESHOLD: string,
        readonly LOWER_THRESHOLD: string,
        readonly MY_PRIVATE_KEY: string,
        readonly PASSWORD: string,
    }
}