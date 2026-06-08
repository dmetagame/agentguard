// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {AgentGuardVault} from "../src/AgentGuardVault.sol";

contract Deploy is Script {
    function run() external returns (AgentGuardVault vault) {
        address platform = vm.envAddress("SOMNIA_PLATFORM");
        uint256 inferenceId = vm.envUint("SOMNIA_INFERENCE_AGENT_ID");
        uint256 parseId = vm.envUint("SOMNIA_PARSE_AGENT_ID");

        vm.startBroadcast();
        vault = new AgentGuardVault(platform, inferenceId, parseId);
        vm.stopBroadcast();

        console.log("AgentGuardVault deployed at:", address(vault));
        console.log("Platform:", platform);
        console.log("Inference agent:", inferenceId);
        console.log("Parse agent:", parseId);
    }
}
