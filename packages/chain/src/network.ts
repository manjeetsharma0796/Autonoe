// X Layer testnet config — OKX's zkEVM L2 and the settlement chain for the whole
// Autonoe stack. Single source of truth for chain id, RPC, native token and
// explorer. Track A's viem clients import `xlayerTestnet` and pass it straight to
// viem's createPublicClient/defineChain.
//
// Migrated off Mantle Sepolia (chain 5003): the arena already sealed on X Layer,
// so running the trading contracts on a second chain left the product split
// across two networks. Everything settles on X Layer now.

export const XLAYER_TESTNET_CHAIN_ID = 1952 as const;

/** X Layer mainnet, for reference — deploys target the testnet above. */
export const XLAYER_MAINNET_CHAIN_ID = 196 as const;

export const RPC_URL =
  (typeof process !== 'undefined' && process.env?.XLAYER_RPC_URL) ||
  'https://testrpc.xlayer.tech';

export const EXPLORER_URL = 'https://www.oklink.com/x-layer-testnet';

export const FAUCET_URL = 'https://www.okx.com/xlayer/faucet';

/** Shape compatible with viem's `Chain` so it can be passed to viem directly. */
export const xlayerTestnet = {
  id: XLAYER_TESTNET_CHAIN_ID,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: EXPLORER_URL },
  },
  testnet: true,
} as const;

/** Build an explorer link for a tx hash. */
export function txUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

/** Build an explorer link for an address. */
export function addressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}
