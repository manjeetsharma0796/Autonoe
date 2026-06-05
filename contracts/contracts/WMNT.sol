// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title WMNT — Wrapped MNT
/// @notice WETH-style wrapper around the native Mantle gas token (MNT). Used as
///         the canonical "WETH" of the Autonoe Uniswap V2 fork (T-104): deposit
///         native MNT to mint WMNT 1:1, withdraw to redeem. Standard 18-decimal
///         ERC-20 so the V2 router can `transferFrom`/`transfer` it.
/// @dev    `totalSupply` is always backed 1:1 by this contract's MNT balance.
contract WMNT is ERC20 {
    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    constructor() ERC20("Wrapped MNT", "WMNT") {}

    /// @notice Wrap native MNT sent with the call into WMNT 1:1.
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Burn `amount` WMNT and return the underlying native MNT.
    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Withdrawal(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "WMNT: MNT transfer failed");
    }

    /// @notice Plain native transfers wrap automatically (WETH9 parity).
    receive() external payable {
        deposit();
    }
}
