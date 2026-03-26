// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BasisSafeGuard} from "../contracts/BasisSafeGuard.sol";
import {MockBasisOracle} from "../contracts/mocks/MockBasisOracle.sol";
import {Enum} from "@safe-global/safe-smart-account/contracts/common/Enum.sol";

contract FailOpenTest is Test {
    event ApiFallbackUsed(address indexed safe, bytes32 txHash);
    event StaleDataWarning(address indexed safe, address token, uint256 age);

    BasisSafeGuard public guard;
    MockBasisOracle public oracle;

    address public safe = address(0x5AFE);
    address public USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    bytes transferData;

    function setUp() public {
        vm.warp(100_000);
        oracle = new MockBasisOracle();
        guard = new BasisSafeGuard(address(oracle));

        vm.prank(safe);
        guard.configure(75, 70, true, true);

        transferData = abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000e6));
    }

    // --- Oracle returns raw score 0 → fail open ---

    function test_failOpen_oracleReturnsZeroScore() public {
        oracle.setScoreSimple(USDC, 0, block.timestamp);

        vm.prank(safe);
        vm.expectEmit(true, false, false, true);
        emit ApiFallbackUsed(safe, bytes32(0));
        guard.checkTransaction(
            USDC, 0, transferData, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- Oracle paused → fail open ---

    function test_oraclePaused_failsOpen() public {
        oracle.setScoreSimple(USDC, 50, block.timestamp);
        oracle.setPaused(true);

        vm.prank(safe);
        vm.expectEmit(true, false, false, true);
        emit ApiFallbackUsed(safe, bytes32(0));
        guard.checkTransaction(
            USDC, 0, transferData, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- Oracle reverts → fail open ---

    function test_failOpen_oracleReverts() public {
        oracle.setShouldRevert(true);

        vm.prank(safe);
        vm.expectEmit(true, false, false, true);
        emit ApiFallbackUsed(safe, bytes32(0));
        guard.checkTransaction(
            USDC, 0, transferData, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- Stale data (>24h old) → fail open ---

    function test_failOpen_staleData() public {
        uint256 staleTimestamp = block.timestamp - 25 hours;
        oracle.setScoreSimple(USDC, 50, staleTimestamp);

        vm.prank(safe);
        vm.expectEmit(true, false, false, true);
        emit StaleDataWarning(safe, USDC, block.timestamp - staleTimestamp);
        guard.checkTransaction(
            USDC, 0, transferData, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- Oracle address is zero → fail open ---

    function test_failOpen_oracleAddressZero() public {
        BasisSafeGuard guardNoOracle = new BasisSafeGuard(address(0));

        vm.prank(safe);
        guardNoOracle.configure(75, 70, true, true);

        vm.prank(safe);
        vm.expectEmit(true, false, false, true);
        emit ApiFallbackUsed(safe, bytes32(0));
        guardNoOracle.checkTransaction(
            USDC, 0, transferData, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- Score exactly at threshold → passes ---

    function test_scoreAtThreshold_passes() public {
        oracle.setScoreSimple(USDC, 70, block.timestamp);

        vm.prank(safe);
        // Should not revert — score == minimum is OK
        guard.checkTransaction(
            USDC, 0, transferData, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- Score exactly at 24h boundary → passes (not stale) ---

    function test_scoreAtExact24hBoundary_passes() public {
        oracle.setScoreSimple(USDC, 85, block.timestamp - 24 hours);

        vm.prank(safe);
        guard.checkTransaction(
            USDC, 0, transferData, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }
}
