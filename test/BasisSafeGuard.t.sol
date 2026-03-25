// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BasisSafeGuard} from "../contracts/BasisSafeGuard.sol";
import {MockBasisOracle} from "../contracts/mocks/MockBasisOracle.sol";
import {Enum} from "@safe-global/safe-smart-account/contracts/common/Enum.sol";

contract BasisSafeGuardTest is Test {
    event ConfigUpdated(
        address indexed safe, uint256 minWalletScore, uint256 minAssetScore, bool enforceMode
    );
    event TransactionWarned(
        address indexed safe, bytes32 txHash, uint256 currentScore, uint256 minRequired, string reason
    );
    event OracleUpdated(address indexed newOracle);

    BasisSafeGuard public guard;
    MockBasisOracle public oracle;

    address public safe = address(0x5AFE);
    address public USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public randomToken = address(0xBEEF);

    function setUp() public {
        oracle = new MockBasisOracle();
        guard = new BasisSafeGuard(address(oracle));
    }

    // --- Constructor ---

    function test_constructor_setsOwner() public view {
        assertEq(guard.owner(), address(this));
    }

    function test_constructor_setsOracle() public view {
        assertEq(guard.basisOracle(), address(oracle));
    }

    function test_constructor_registersStablecoins() public view {
        assertTrue(guard.knownStablecoins(USDC));
        assertTrue(guard.knownStablecoins(USDT));
        assertFalse(guard.knownStablecoins(randomToken));
    }

    // --- Configure ---

    function test_configure_setsConfig() public {
        vm.prank(safe);
        guard.configure(80, 75, true, true);

        (uint256 minWallet, uint256 minAsset, bool enforce, bool useOracle, bool initialized) =
            guard.configs(safe);
        assertEq(minWallet, 80);
        assertEq(minAsset, 75);
        assertTrue(enforce);
        assertTrue(useOracle);
        assertTrue(initialized);
    }

    function test_configure_emitsEvent() public {
        vm.prank(safe);
        vm.expectEmit(true, false, false, true);
        emit ConfigUpdated(safe, 80, 75, true);
        guard.configure(80, 75, true, true);
    }

    // --- setOracle ---

    function test_setOracle_ownerCanSet() public {
        address newOracle = address(0x1234);
        guard.setOracle(newOracle);
        assertEq(guard.basisOracle(), newOracle);
    }

    function test_setOracle_nonOwnerReverts() public {
        vm.prank(safe);
        vm.expectRevert(BasisSafeGuard.OnlyOwner.selector);
        guard.setOracle(address(0x1234));
    }

    function test_setOracle_emitsEvent() public {
        address newOracle = address(0x1234);
        vm.expectEmit(true, false, false, false);
        emit OracleUpdated(newOracle);
        guard.setOracle(newOracle);
    }

    // --- checkTransaction: uninitialized config ---

    function test_checkTransaction_uninitializedAllows() public {
        bytes memory data = abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000));
        vm.prank(safe);
        // Should not revert
        guard.checkTransaction(
            USDC, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- checkTransaction: transfer with good score ---

    function test_checkTransaction_transferGoodScore() public {
        vm.prank(safe);
        guard.configure(75, 70, true, true);

        oracle.setScore(USDC, 85, block.timestamp);

        bytes memory data = abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000e6));
        vm.prank(safe);
        guard.checkTransaction(
            USDC, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- checkTransaction: transfer with bad score in enforce mode ---

    function test_checkTransaction_transferBadScoreEnforceReverts() public {
        vm.prank(safe);
        guard.configure(75, 70, true, true);

        oracle.setScore(USDC, 50, block.timestamp);

        bytes memory data = abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000e6));
        vm.prank(safe);
        vm.expectRevert(
            abi.encodeWithSelector(
                BasisSafeGuard.TransactionBelowThreshold.selector,
                USDC,
                50,
                70,
                "Asset SII score below minimum"
            )
        );
        guard.checkTransaction(
            USDC, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- checkTransaction: transfer with bad score in warn mode ---

    function test_checkTransaction_transferBadScoreWarnEmits() public {
        vm.prank(safe);
        guard.configure(75, 70, false, true);

        oracle.setScore(USDC, 50, block.timestamp);

        bytes memory data = abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000e6));
        vm.prank(safe);
        vm.expectEmit(true, false, false, true);
        emit TransactionWarned(
            safe, bytes32(0), 50, 70, "Asset SII score below minimum"
        );
        guard.checkTransaction(
            USDC, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- checkTransaction: non-stablecoin passes through ---

    function test_checkTransaction_nonStablecoinPassesThrough() public {
        vm.prank(safe);
        guard.configure(75, 70, true, true);

        bytes memory data = abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000));
        vm.prank(safe);
        // randomToken is not a known stablecoin, should pass
        guard.checkTransaction(
            randomToken, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- checkTransaction: ETH transfer passes ---

    function test_checkTransaction_ethTransferPasses() public {
        vm.prank(safe);
        guard.configure(75, 70, true, true);

        vm.prank(safe);
        guard.checkTransaction(
            address(0x1), 1 ether, "", Enum.Operation.Call, 0, 0, 0, address(0), payable(0), "", address(0)
        );
    }

    // --- supportsInterface ---

    function test_supportsInterface() public view {
        // Guard interface ID: 0xe6d7a83a
        assertTrue(guard.supportsInterface(0xe6d7a83a));
        // IERC165: 0x01ffc9a7
        assertTrue(guard.supportsInterface(0x01ffc9a7));
        // Random interface
        assertFalse(guard.supportsInterface(0xdeadbeef));
    }

    // --- checkAfterExecution (no-op, just verify it doesn't revert) ---

    function test_checkAfterExecution_doesNotRevert() public {
        guard.checkAfterExecution(bytes32(0), true);
        guard.checkAfterExecution(bytes32(0), false);
    }

    // --- MAX_SCORE_AGE ---

    function test_maxScoreAge() public view {
        assertEq(guard.MAX_SCORE_AGE(), 24 hours);
    }
}
