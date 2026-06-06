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
} from './wallet.js';

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
} from './policy.js';

export { exportPrivateKey, exportKeystoreJSON } from './export.js';

export {
  MNT_FAUCET_URL,
  MUSD_ADDRESS,
  musdBalance,
  claimMusdFaucet,
  seedAgentWallet,
  buildClients,
  type PublicClientLike,
  type WalletClientLike,
  type FundingClients,
  type SeedResult,
} from './funding.js';

export {
  scaleToBaseUnits,
  buildSwapPlan,
  executeOption,
  type ExecutableOption,
  type ExecuteOptionInput,
  type ExecuteOptionResult,
  type ExecuteDeps,
} from './execute.js';
