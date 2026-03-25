// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BasisSafeGuard} from "../contracts/BasisSafeGuard.sol";
import {MockBasisOracle} from "../contracts/mocks/MockBasisOracle.sol";
import {Enum} from "@safe-global/safe-smart-account/contracts/common/Enum.sol";

contract MultiSendTest is Test {
    BasisSafeGuard public guard;
    MockBasisOracle public oracle;

    address public safe = address(0x5AFE);
    address public USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;

    function setUp() public {
        oracle = new MockBasisOracle();
        guard = new BasisSafeGuard(address(oracle));

        vm.prank(safe);
        guard.configure(75, 70, true, true);
    }

    function _encodeMultiSendTx(uint8 operation, address to, uint256 value, bytes memory data)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(operation, to, value, data.length, data);
    }

    function _wrapAsMultiSend(bytes memory transactions) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(0x8d80ff0a, transactions);
    }

    // --- MultiSend with good scores ---

    function test_multiSend_allGoodScores() public {
        oracle.setScore(USDC, 85, block.timestamp);
        oracle.setScore(USDT, 80, block.timestamp);

        bytes memory transferUSDC =
            abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000e6));
        bytes memory transferUSDT =
            abi.encodeWithSelector(0xa9059cbb, address(0x2), uint256(2000e6));

        bytes memory txs = abi.encodePacked(
            _encodeMultiSendTx(0, USDC, 0, transferUSDC),
            _encodeMultiSendTx(0, USDT, 0, transferUSDT)
        );

        bytes memory data = _wrapAsMultiSend(txs);

        vm.prank(safe);
        guard.checkTransaction(
            address(0xA1FA),
            0,
            data,
            Enum.Operation.DelegateCall,
            0,
            0,
            0,
            address(0),
            payable(0),
            "",
            address(0)
        );
    }

    // --- MultiSend with one bad score in enforce mode ---

    function test_multiSend_oneBadScoreReverts() public {
        oracle.setScore(USDC, 85, block.timestamp);
        oracle.setScore(USDT, 50, block.timestamp);

        bytes memory transferUSDC =
            abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000e6));
        bytes memory transferUSDT =
            abi.encodeWithSelector(0xa9059cbb, address(0x2), uint256(2000e6));

        bytes memory txs = abi.encodePacked(
            _encodeMultiSendTx(0, USDC, 0, transferUSDC),
            _encodeMultiSendTx(0, USDT, 0, transferUSDT)
        );

        bytes memory data = _wrapAsMultiSend(txs);

        vm.prank(safe);
        vm.expectRevert(
            abi.encodeWithSelector(
                BasisSafeGuard.TransactionBelowThreshold.selector,
                USDT,
                50,
                70,
                "Asset SII score below minimum"
            )
        );
        guard.checkTransaction(
            address(0xA1FA),
            0,
            data,
            Enum.Operation.DelegateCall,
            0,
            0,
            0,
            address(0),
            payable(0),
            "",
            address(0)
        );
    }

    // --- MultiSend with non-stablecoin transfers passes ---

    function test_multiSend_nonStablecoinPasses() public {
        address randomToken = address(0xBEEF);
        bytes memory transferRandom =
            abi.encodeWithSelector(0xa9059cbb, address(0x1), uint256(1000));

        bytes memory txs = _encodeMultiSendTx(0, randomToken, 0, transferRandom);
        bytes memory data = _wrapAsMultiSend(txs);

        vm.prank(safe);
        guard.checkTransaction(
            address(0xA1FA),
            0,
            data,
            Enum.Operation.DelegateCall,
            0,
            0,
            0,
            address(0),
            payable(0),
            "",
            address(0)
        );
    }

    // --- Empty MultiSend data passes ---

    function test_multiSend_emptyDataPasses() public {
        // Data too short to decode
        bytes memory data = abi.encodeWithSelector(0x8d80ff0a);

        vm.prank(safe);
        guard.checkTransaction(
            address(0xA1FA),
            0,
            data,
            Enum.Operation.DelegateCall,
            0,
            0,
            0,
            address(0),
            payable(0),
            "",
            address(0)
        );
    }
}
