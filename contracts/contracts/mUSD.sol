// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title mUSD — Autonoe mock USD stablecoin
/// @notice 6-decimal ERC-20 used as the quote currency for every Autonoe
///         `mUSD/<asset>` pair on Mantle Sepolia. Anyone can `faucet()` test
///         funds (fixed amount, per-address cooldown + lifetime cap); the owner
///         can `ownerMint()` to seed liquidity (T-106 deploy/seed script).
/// @dev    Testnet-only play money — no real value.
contract mUSD is ERC20, Ownable {
    /// @notice mUSD uses 6 decimals (USDC-style), not the ERC-20 default of 18.
    uint8 private constant DECIMALS = 6;

    /// @notice Amount minted per `faucet()` call: 1,000 mUSD.
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** DECIMALS;

    /// @notice Minimum delay between two `faucet()` calls from one address.
    uint256 public constant FAUCET_COOLDOWN = 8 hours;

    /// @notice Lifetime cap on tokens a single address can pull from the faucet.
    uint256 public constant FAUCET_CAP = 10_000 * 10 ** DECIMALS;

    /// @notice Last `faucet()` timestamp per address (0 if never claimed).
    mapping(address => uint256) public lastFaucetAt;

    /// @notice Cumulative amount each address has minted via the faucet.
    mapping(address => uint256) public faucetMinted;

    /// @notice Emitted on every successful faucet claim.
    event FaucetClaimed(address indexed to, uint256 amount);

    constructor() ERC20("Autonoe Mock USD", "mUSD") Ownable(msg.sender) {}

    /// @inheritdoc ERC20
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Mint `FAUCET_AMOUNT` to the caller, subject to cooldown + cap.
    function faucet() external {
        uint256 last = lastFaucetAt[msg.sender];
        require(
            last == 0 || block.timestamp >= last + FAUCET_COOLDOWN,
            "mUSD: faucet cooldown"
        );
        require(
            faucetMinted[msg.sender] + FAUCET_AMOUNT <= FAUCET_CAP,
            "mUSD: faucet cap reached"
        );

        lastFaucetAt[msg.sender] = block.timestamp;
        faucetMinted[msg.sender] += FAUCET_AMOUNT;

        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Owner-only mint for seeding liquidity / treasury.
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
