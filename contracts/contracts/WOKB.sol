// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title WOKB — Wrapped OKB (WETH-style wrapper, PRD §7)
/// @notice Deposit native OKB to mint 1:1 WOKB; withdraw to burn and reclaim OKB.
///         WOKB is the ERC-20 the AMM trades (the real `mUSD/WOKB` pool).
contract WOKB is ERC20 {
    event Deposit(address indexed dst, uint256 amount);
    event Withdrawal(address indexed src, uint256 amount);

    constructor() ERC20("Wrapped OKB", "WOKB") {}

    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public {
        _burn(msg.sender, amount);
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "OKB_TRANSFER_FAILED");
        emit Withdrawal(msg.sender, amount);
    }

    receive() external payable {
        deposit();
    }
}
