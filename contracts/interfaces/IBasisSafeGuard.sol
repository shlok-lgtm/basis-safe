// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBasisSafeGuard {
    struct GuardConfig {
        uint256 minWalletRiskScore;
        uint256 minAssetSiiScore;
        bool enforceMode;
        bool useOracle;
        bool initialized;
    }

    event ConfigUpdated(
        address indexed safe, uint256 minWalletScore, uint256 minAssetScore, bool enforceMode
    );
    event TransactionBlocked(
        address indexed safe,
        bytes32 txHash,
        uint256 currentScore,
        uint256 minRequired,
        string reason
    );
    event TransactionWarned(
        address indexed safe,
        bytes32 txHash,
        uint256 currentScore,
        uint256 minRequired,
        string reason
    );
    event OracleUpdated(address indexed newOracle);
    event ApiFallbackUsed(address indexed safe, bytes32 txHash);
    event StaleDataWarning(address indexed safe, address token, uint256 age);

    error TransactionBelowThreshold(address token, uint256 score, uint256 minimum, string reason);
    error OnlyOwner();

    function configure(
        uint256 _minWalletRiskScore,
        uint256 _minAssetSiiScore,
        bool _enforceMode,
        bool _useOracle
    ) external;

    function setOracle(address _oracle) external;
}
