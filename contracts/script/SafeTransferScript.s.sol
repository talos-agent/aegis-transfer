// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {SafeTransfer} from "../src/SafeTransfer.sol";

contract SafeTransferScript is Script {
    SafeTransfer public safeTransfer;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        safeTransfer = new SafeTransfer();

        vm.stopBroadcast();
    }
}
