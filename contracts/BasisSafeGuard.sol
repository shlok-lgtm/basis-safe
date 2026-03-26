// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseGuard} from "@safe-global/safe-smart-account/contracts/base/GuardManager.sol";
import {Enum} from "@safe-global/safe-smart-account/contracts/common/Enum.sol";
import {IBasisOracle} from "./interfaces/IBasisOracle.sol";

contract BasisSafeGuard is BaseGuard {
    // --- Events ---
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
    event KnownStablecoinAdded(address indexed token);
    event KnownStablecoinRemoved(address indexed token);

    // --- Errors ---
    error TransactionBelowThreshold(address token, uint256 score, uint256 minimum, string reason);
    error OnlyOwner();

    // --- Structs ---
    struct GuardConfig {
        uint256 minWalletRiskScore; // 0-100, default 75
        uint256 minAssetSiiScore; // 0-100, default 70
        bool enforceMode; // true = block, false = warn-only
        bool useOracle; // true = on-chain oracle, false = API relay
        bool initialized;
    }

    // --- Constants ---
    uint256 public constant MAX_SCORE_AGE = 24 hours;
    bytes4 private constant TRANSFER_SELECTOR = 0xa9059cbb;
    bytes4 private constant APPROVE_SELECTOR = 0x095ea7b3;
    bytes4 private constant MULTISEND_SELECTOR = 0x8d80ff0a;

    // --- State ---
    mapping(address => GuardConfig) public configs;
    address public basisOracle;
    address public owner;
    mapping(address => bool) public knownStablecoins;

    constructor(address _oracle) {
        owner = msg.sender;
        basisOracle = _oracle;
        _initKnownStablecoins();
    }

    // --- Configuration (callable by the Safe itself via multisig tx) ---
    function configure(
        uint256 _minWalletRiskScore,
        uint256 _minAssetSiiScore,
        bool _enforceMode,
        bool _useOracle
    ) external {
        configs[msg.sender] = GuardConfig({
            minWalletRiskScore: _minWalletRiskScore,
            minAssetSiiScore: _minAssetSiiScore,
            enforceMode: _enforceMode,
            useOracle: _useOracle,
            initialized: true
        });
        emit ConfigUpdated(msg.sender, _minWalletRiskScore, _minAssetSiiScore, _enforceMode);
    }

    function setOracle(address _oracle) external {
        if (msg.sender != owner) revert OnlyOwner();
        basisOracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    function addKnownStablecoin(address token) external {
        if (msg.sender != owner) revert OnlyOwner();
        knownStablecoins[token] = true;
        emit KnownStablecoinAdded(token);
    }

    function removeKnownStablecoin(address token) external {
        if (msg.sender != owner) revert OnlyOwner();
        knownStablecoins[token] = false;
        emit KnownStablecoinRemoved(token);
    }

    // --- checkTransaction (BEFORE every Safe tx) ---
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external override {
        GuardConfig memory cfg = configs[msg.sender];
        if (!cfg.initialized) return; // no policy set — allow everything

        if (data.length >= 4) {
            bytes4 selector;
            assembly {
                selector := mload(add(data, 32))
            }

            if (selector == MULTISEND_SELECTOR) {
                _checkMultiSend(msg.sender, data, cfg);
            } else if (selector == TRANSFER_SELECTOR && knownStablecoins[to]) {
                _checkAssetScore(msg.sender, to, cfg);
            }
        }
    }

    // --- checkAfterExecution (AFTER tx, cannot revert) ---
    function checkAfterExecution(bytes32 hash, bool success) external override {
        // Audit trail only — future: emit pre/post score delta
    }

    // --- Check single asset SII score ---
    function _checkAssetScore(address safe, address token, GuardConfig memory cfg) internal {
        if (basisOracle == address(0)) {
            emit ApiFallbackUsed(safe, bytes32(0));
            return; // fail open — no oracle configured
        }

        // If oracle is paused, fail open
        try IBasisOracle(basisOracle).paused() returns (bool isPaused) {
            if (isPaused) {
                emit ApiFallbackUsed(safe, bytes32(0));
                return;
            }
        } catch {
            emit ApiFallbackUsed(safe, bytes32(0));
            return;
        }

        try IBasisOracle(basisOracle).getScore(token) returns (
            uint16 rawScore, bytes2, uint48 timestamp, uint16
        ) {
            // Convert from 0-10000 to 0-100 to match GuardConfig thresholds
            uint256 score = uint256(rawScore) / 100;

            if (rawScore == 0) {
                emit ApiFallbackUsed(safe, bytes32(0));
                return; // never-scored or zero — fail open
            }
            if (block.timestamp - uint256(timestamp) > MAX_SCORE_AGE) {
                emit StaleDataWarning(safe, token, block.timestamp - uint256(timestamp));
                return; // stale — fail open
            }
            if (score < cfg.minAssetSiiScore) {
                if (cfg.enforceMode) {
                    revert TransactionBelowThreshold(
                        token, score, cfg.minAssetSiiScore, "Asset SII score below minimum"
                    );
                } else {
                    emit TransactionWarned(
                        safe, bytes32(0), score, cfg.minAssetSiiScore,
                        "Asset SII score below minimum"
                    );
                }
            }
        } catch {
            emit ApiFallbackUsed(safe, bytes32(0));
        }
    }

    // --- Decode and check MultiSend batch ---
    function _checkMultiSend(address safe, bytes memory data, GuardConfig memory cfg) internal {
        if (data.length < 68) return;
        uint256 offset = 68;
        uint256 dataLength;
        assembly {
            dataLength := mload(add(data, 68))
        }
        uint256 end = 68 + dataLength;

        while (offset < end && offset < data.length) {
            if (offset + 85 > data.length) break;

            address to;
            assembly {
                to := shr(96, mload(add(add(data, 0x21), offset)))
            }

            uint256 subDataLen;
            assembly {
                subDataLen := mload(add(add(data, 0x55), offset))
            }

            if (subDataLen >= 4 && knownStablecoins[to]) {
                bytes4 subSelector;
                assembly {
                    subSelector := mload(add(add(data, 0x75), offset))
                }
                if (subSelector == TRANSFER_SELECTOR) {
                    _checkAssetScore(safe, to, cfg);
                }
            }
            offset += 85 + subDataLen;
        }
    }

    // --- Known stablecoin addresses (Ethereum mainnet) ---
    function _initKnownStablecoins() internal {
        knownStablecoins[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = true; // USDC
        knownStablecoins[0xdAC17F958D2ee523a2206206994597C13D831ec7] = true; // USDT
        knownStablecoins[0x6B175474E89094C44Da98b954EedeAC495271d0F] = true; // DAI
        knownStablecoins[0x853d955aCEf822Db058eb8505911ED77F175b99e] = true; // FRAX
        knownStablecoins[0x6c3ea9036406852006290770BEdFcAbA0e23A0e8] = true; // PYUSD
        knownStablecoins[0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409] = true; // FDUSD
        knownStablecoins[0x0000000000085d4780B73119b644AE5ecd22b376] = true; // TUSD
        knownStablecoins[0x0C10bF8FcB7Bf5412187A595ab97a3609160b5c6] = true; // USDD
        knownStablecoins[0x4c9EDD5852cd905f086C759E8383e09bff1E68B3] = true; // USDe
        knownStablecoins[0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d] = true; // USD1
    }
}
