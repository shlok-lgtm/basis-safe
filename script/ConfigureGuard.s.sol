// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BasisSafeGuard} from "../contracts/BasisSafeGuard.sol";

contract ConfigureGuard is Script {
    function run() external {
        address guardAddress = vm.envAddress("GUARD_ADDRESS");
        uint256 minWalletScore = vm.envOr("MIN_WALLET_SCORE", uint256(75));
        uint256 minAssetScore = vm.envOr("MIN_ASSET_SCORE", uint256(70));
        bool enforceMode = vm.envOr("ENFORCE_MODE", false);
        bool useOracle = vm.envOr("USE_ORACLE", false);

        BasisSafeGuard guard = BasisSafeGuard(guardAddress);

        vm.startBroadcast();

        guard.configure(minWalletScore, minAssetScore, enforceMode, useOracle);

        vm.stopBroadcast();

        console.log("Guard configured at:", guardAddress);
        console.log("Min wallet score:", minWalletScore);
        console.log("Min asset score:", minAssetScore);
        console.log("Enforce mode:", enforceMode);
        console.log("Use oracle:", useOracle);
    }
}
