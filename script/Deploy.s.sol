// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BasisSafeGuard} from "../contracts/BasisSafeGuard.sol";

contract Deploy is Script {
    function run() external {
        address oracle = vm.envOr("BASIS_ORACLE", address(0));

        vm.startBroadcast();

        BasisSafeGuard guard = new BasisSafeGuard(oracle);

        vm.stopBroadcast();

        console.log("BasisSafeGuard deployed at:", address(guard));
        console.log("Oracle address:", oracle);
        console.log("Owner:", guard.owner());
    }
}
