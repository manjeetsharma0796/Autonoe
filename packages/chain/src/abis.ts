// Minimal `as const` ABIs for the functions the chain lib calls — kept inline
// (rather than importing the full JSON ABIs) so viem infers exact arg/return
// types. The complete ABIs live in `packages/chain/abis/` for other consumers.

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const;

export const ROUTER_ABI = [
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

const DECISION_TUPLE = {
  type: 'tuple[]',
  components: [
    { name: 'user', type: 'address' },
    { name: 'thesisHash', type: 'bytes32' },
    { name: 'verdictHash', type: 'bytes32' },
    { name: 'asset', type: 'address' },
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOut', type: 'uint256' },
    { name: 'pnl', type: 'int256' },
    { name: 'optionRef', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
  ],
} as const;

export const DECISION_LOG_ABI = [
  {
    type: 'function',
    name: 'logDecision',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'thesisHash', type: 'bytes32' },
      { name: 'verdictHash', type: 'bytes32' },
      { name: 'asset', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOut', type: 'uint256' },
      { name: 'pnl', type: 'int256' },
      { name: 'optionRef', type: 'string' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getUserDecisions',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'history', ...DECISION_TUPLE }],
  },
] as const;
