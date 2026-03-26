// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BasisSafeGuard} from "../contracts/BasisSafeGuard.sol";
import {MockBasisOracle} from "../contracts/mocks/MockBasisOracle.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";
import {Enum} from "@safe-global/safe-smart-account/contracts/common/Enum.sol";

contract IntegrationTest is Test {
    event TransactionWarned(
        address indexed safe, bytes32 txHash, uint256 currentScore, uint256 minRequired, string reason
    );

    BasisSafeGuard public guard;
    MockBasisOracle public oracle;
    MockERC20 public usdc;

    address public deployer = address(this);
    address public safe = address(0x5AFE);
    address public recipient = address(0xBEEF);
    address public USDC_MAINNET = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function setUp() public {
        oracle = new MockBasisOracle();
        guard = new BasisSafeGuard(address(oracle));
    }

    // --- Full lifecycle: deploy → configure → check → update oracle ---

    function test_fullLifecycle() public {
        // 1. Guard deployed with oracle
        assertEq(guard.basisOracle(), address(oracle));
        assertEq(guard.owner(), deployer);

        // 2. Safe configures guard in warn mode
        vm.prank(safe);
        guard.configure(75, 70, false, true);

        (uint256 minWallet, uint256 minAsset, bool enforce, bool useOracle, bool init) =
            guard.configs(safe);
        assertEq(minWallet, 75);
        assertEq(minAsset, 70);
        assertFalse(enforce);
        assertTrue(useOracle);
        assertTrue(init);

        // 3. Oracle has good score → transfer allowed
        oracle.setScoreSimple(USDC_MAINNET, 85, block.timestamp);

        bytes memory transferData =
            abi.encodeWithSelector(0xa9059cbb, recipient, uint256(1000e6));

        vm.prank(safe);
        guard.checkTransaction(
            USDC_MAINNET,
            0,
            transferData,
            Enum.Operation.Call,
            0,
            0,
            0,
            address(0),
            payable(0),
            "",
            address(0)
        );

        // 4. Score drops → warn emitted (not enforce)
        oracle.setScoreSimple(USDC_MAINNET, 50, block.timestamp);

        vm.prank(safe);
        vm.expectEmit(true, false, false, true);
        emit TransactionWarned(
            safe, bytes32(0), 50, 70, "Asset SII score below minimum"
        );
        guard.checkTransaction(
            USDC_MAINNET,
            0,
            transferData,
            Enum.Operation.Call,
            0,
            0,
            0,
            address(0),
            payable(0),
            "",
            address(0)
        );

        // 5. Safe switches to enforce mode
        vm.prank(safe);
        guard.configure(75, 70, true, true);

        // 6. Same low score now blocks
        vm.prank(safe);
        vm.expectRevert(
            abi.encodeWithSelector(
                BasisSafeGuard.TransactionBelowThreshold.selector,
                USDC_MAINNET,
                50,
                70,
                "Asset SII score below minimum"
            )
        );
        guard.checkTransaction(
            USDC_MAINNET,
            0,
            transferData,
            Enum.Operation.Call,
            0,
            0,
            0,
            address(0),
            payable(0),
            "",
            address(0)
        );

        // 7. Owner updates oracle
        address newOracle = address(new MockBasisOracle());
        guard.setOracle(newOracle);
        assertEq(guard.basisOracle(), newOracle);
    }

    // --- Multiple safes with different configs ---

    function test_multipleSafesIndependentConfigs() public {
        address safe1 = address(0x1111);
        address safe2 = address(0x2222);

        vm.prank(safe1);
        guard.configure(80, 75, true, true);

        vm.prank(safe2);
        guard.configure(60, 50, false, false);

        (uint256 mw1, uint256 ma1, bool e1,,) = guard.configs(safe1);
        (uint256 mw2, uint256 ma2, bool e2,,) = guard.configs(safe2);

        assertEq(mw1, 80);
        assertEq(ma1, 75);
        assertTrue(e1);

        assertEq(mw2, 60);
        assertEq(ma2, 50);
        assertFalse(e2);
    }

    // --- Reconfigure does not affect other safes ---

    function test_reconfigureIsolation() public {
        address safe1 = address(0x1111);
        address safe2 = address(0x2222);

        vm.prank(safe1);
        guard.configure(80, 75, true, true);

        vm.prank(safe2);
        guard.configure(60, 50, false, false);

        // safe1 reconfigures
        vm.prank(safe1);
        guard.configure(90, 85, false, true);

        // safe2 unchanged
        (uint256 mw2, uint256 ma2, bool e2,,) = guard.configs(safe2);
        assertEq(mw2, 60);
        assertEq(ma2, 50);
        assertFalse(e2);
    }

    // --- All 10 known stablecoins are registered ---

    function test_allKnownStablecoinsRegistered() public view {
        address[10] memory stablecoins = [
            0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, // USDC
            0xdAC17F958D2ee523a2206206994597C13D831ec7, // USDT
            0x6B175474E89094C44Da98b954EedeAC495271d0F, // DAI
            0x853d955aCEf822Db058eb8505911ED77F175b99e, // FRAX
            0x6c3ea9036406852006290770BEdFcAbA0e23A0e8, // PYUSD
            0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409, // FDUSD
            0x0000000000085d4780B73119b644AE5ecd22b376, // TUSD
            0x0C10bF8FcB7Bf5412187A595ab97a3609160b5c6, // USDD
            0x4c9EDD5852cd905f086C759E8383e09bff1E68B3, // USDe
            0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d  // USD1
        ];

        for (uint256 i = 0; i < stablecoins.length; i++) {
            assertTrue(guard.knownStablecoins(stablecoins[i]));
        }
    }
}
