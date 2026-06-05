// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC20} from "./MockERC20.sol";

/// @title MockBTC — Autonoe mock Bitcoin (18-decimal ERC-20)
/// @notice Tradeable as the `mUSD/MockBTC` pair (T-109). Uses 18 decimals (not
///         BTC's native 8) for uniform math across the mock asset set.
contract MockBTC is MockERC20 {
    constructor() MockERC20("Mock BTC", "mBTC") {}
}
