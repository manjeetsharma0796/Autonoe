import { test, expect } from 'bun:test';
import {
  XLAYER_TESTNET_CHAIN_ID,
  xlayerTestnet,
  txUrl,
  addressUrl,
  EXPLORER_URL,
} from './index.js';

test('chain id is X Layer testnet 1952', () => {
  expect(XLAYER_TESTNET_CHAIN_ID).toBe(1952);
  expect(xlayerTestnet.id).toBe(1952);
  expect(xlayerTestnet.nativeCurrency.symbol).toBe('OKB');
});

test('explorer link helpers build oklink urls', () => {
  expect(EXPLORER_URL).toContain('oklink.com');
  expect(txUrl('0xabc')).toBe(`${EXPLORER_URL}/tx/0xabc`);
  expect(addressUrl('0xdef')).toBe(`${EXPLORER_URL}/address/0xdef`);
});
