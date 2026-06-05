// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DecisionLog — on-chain record of Autonoe trade decisions
/// @notice Every executed option (T-304) writes its provenance here: the
///         thesis + verdict hashes, the asset traded, in/out amounts, realized
///         PnL, and the chosen option reference. Emits an event (cheap indexing
///         for the history page, T-411) and stores a per-user history the viem
///         lib reads back via `readHistory()` (T-108) for `/api/history`.
/// @dev    `pnl` is signed (mUSD base units, can be negative). `asset` is the
///         traded token address; `optionRef` mirrors the off-chain
///         `RefinedOption.optionRef` string. Hashes are caller-computed.
contract DecisionLog {
    struct Decision {
        address user;
        bytes32 thesisHash;
        bytes32 verdictHash;
        address asset;
        uint256 amountIn;
        uint256 amountOut;
        int256 pnl;
        string optionRef;
        uint64 timestamp;
    }

    /// @dev Global append-only log; `id` is the index into this array.
    Decision[] private _decisions;

    /// @dev Per-user list of ids into `_decisions`.
    mapping(address => uint256[]) private _userIds;

    event DecisionLogged(
        uint256 indexed id,
        address indexed user,
        address indexed asset,
        bytes32 thesisHash,
        bytes32 verdictHash,
        uint256 amountIn,
        uint256 amountOut,
        int256 pnl,
        string optionRef,
        uint64 timestamp
    );

    /// @notice Record a decision for `msg.sender`. Returns its global id.
    function logDecision(
        bytes32 thesisHash,
        bytes32 verdictHash,
        address asset,
        uint256 amountIn,
        uint256 amountOut,
        int256 pnl,
        string calldata optionRef
    ) external returns (uint256 id) {
        id = _decisions.length;

        _decisions.push(
            Decision({
                user: msg.sender,
                thesisHash: thesisHash,
                verdictHash: verdictHash,
                asset: asset,
                amountIn: amountIn,
                amountOut: amountOut,
                pnl: pnl,
                optionRef: optionRef,
                timestamp: uint64(block.timestamp)
            })
        );
        _userIds[msg.sender].push(id);

        emit DecisionLogged(
            id,
            msg.sender,
            asset,
            thesisHash,
            verdictHash,
            amountIn,
            amountOut,
            pnl,
            optionRef,
            uint64(block.timestamp)
        );
    }

    /// @notice Total number of decisions ever logged.
    function totalDecisions() external view returns (uint256) {
        return _decisions.length;
    }

    /// @notice Fetch a single decision by global id.
    function getDecision(uint256 id) external view returns (Decision memory) {
        require(id < _decisions.length, "DecisionLog: bad id");
        return _decisions[id];
    }

    /// @notice Number of decisions logged by `user`.
    function getUserDecisionCount(
        address user
    ) external view returns (uint256) {
        return _userIds[user].length;
    }

    /// @notice The global ids of every decision logged by `user`.
    function getUserDecisionIds(
        address user
    ) external view returns (uint256[] memory) {
        return _userIds[user];
    }

    /// @notice Full per-user history, newest-last (T-108 `readHistory`).
    function getUserDecisions(
        address user
    ) external view returns (Decision[] memory history) {
        uint256[] storage ids = _userIds[user];
        history = new Decision[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            history[i] = _decisions[ids[i]];
        }
    }
}
