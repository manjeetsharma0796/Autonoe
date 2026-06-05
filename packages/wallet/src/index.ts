// Public API for the embedded agent wallet core.

export {
  KEYSTORE_KEY,
  createAgentWallet,
  unlock,
  isCreated,
  loadKeystore,
  memoryStore,
  type Keystore,
  type WalletStore,
} from './wallet.ts';

export {
  POLICY_KEY,
  DEFAULT_POLICY,
  checkPolicy,
  enforcePolicy,
  getPolicy,
  setPolicy,
  type SpendingPolicy,
  type PolicyCheckInput,
  type PolicyCheckResult,
} from './policy.ts';

export { exportPrivateKey, exportKeystoreJSON } from './export.ts';

export {
  executeOption,
  closeSyntheticPosition,
  type Direction,
  type ExecuteOptionInput,
  type ExecuteResult,
  type CloseSyntheticInput,
  type CloseResult,
} from './execute.ts';

export {
  MNT_FAUCET_URL,
  getAgentBalances,
  fundMUSD,
  type AgentBalances,
} from './funding.ts';
