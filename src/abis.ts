import { AbiItem } from "web3-utils";

export const abiRate: AbiItem[] = [
    {
        constant: true,
        inputs: [],
        name: "getReserves",
        outputs: [
          { internalType: "uint112", name: "_reserve0", type: "uint112" },
          { internalType: "uint112", name: "_reserve1", type: "uint112" },
          { internalType: "uint32", name: "_blockTimestampLast", type: "uint32" },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
];

export const abiERC20: AbiItem[] = [
  // balanceOf
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  // decimals
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "tokens", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const abiUniswapV2Router: AbiItem[] = [
    {
        inputs: [
          {
            internalType: "uint256",
            name: "amountIn",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amountOutMin",
            type: "uint256",
          },
          {
            internalType: "address[]",
            name: "path",
            type: "address[]",
          },
          {
            internalType: "address",
            name: "to",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        name: "swapExactTokensForTokens",
        outputs: [
          {
            internalType: "uint256[]",
            name: "amounts",
            type: "uint256[]",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
];