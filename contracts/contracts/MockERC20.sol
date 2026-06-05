// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20 — shared base for Autonoe's mock trading assets
/// @notice 18-decimal ERC-20 with an open `mint()` so tests, the deploy/seed
///         script (T-106), and the wallet's faucet helpers (T-305) can freely
///         create testnet balances. Testnet-only play money — no real value.
abstract contract MockERC20 is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {}

    /// @notice Mint `amount` of this asset to `to`. Open by design (testnet).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
