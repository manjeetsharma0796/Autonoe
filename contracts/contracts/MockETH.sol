// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC20} from "./MockERC20.sol";

/// @title MockETH — Autonoe mock Ether (18-decimal ERC-20)
/// @notice Tradeable as the `mUSD/MockETH` pair (T-109).
contract MockETH is MockERC20 {
    constructor() MockERC20("Mock ETH", "mETH") {}
}
