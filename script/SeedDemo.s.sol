// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {AgentGuardVault} from "../src/AgentGuardVault.sol";

/// Seeds a deployed AgentGuardVault with a 24h-timelock policy, a deposit,
/// and one proposed action per demo scenario:
///   #1 Safe Payment      → allowlisted target, expected APPROVE
///   #2 Suspicious Drain  → unallowed target, ~90% of vault, expected BLOCK
///   #3 Ambiguous Action  → unknown dApp with evidenceUrl, expected REVIEW
///
/// Env vars:
///   VAULT             address of deployed AgentGuardVault
///   DEMO_RECIPIENT    allowlisted address (Scenario 1 target)
///   DEMO_DRAINER      unallowed address (Scenario 2 target)
///   DEMO_UNKNOWN_DAPP unknown contract address (Scenario 3 target)
///   DEMO_EVIDENCE_URL URL the Parse-Website agent will fetch (Scenario 3)
///   DEMO_DEPOSIT_WEI  amount to deposit into the vault, in wei (default 2 ether)
///   DEMO_REVIEW_DEPOSIT_WEI  wei attached to each requestAgentReview (default 0.4 ether)
///   SEED_FIRE_REVIEW  if "1", also fires requestAgentReview on each action
contract SeedDemo is Script {
    function run() external {
        address vaultAddr = vm.envAddress("VAULT");
        address recipient = vm.envAddress("DEMO_RECIPIENT");
        address drainer = vm.envAddress("DEMO_DRAINER");
        address unknownDapp = vm.envAddress("DEMO_UNKNOWN_DAPP");
        string memory evidenceUrl = vm.envOr("DEMO_EVIDENCE_URL", string("https://unknown.fi"));
        uint256 deposit_ = vm.envOr("DEMO_DEPOSIT_WEI", uint256(2 ether));
        uint256 reviewDeposit = vm.envOr("DEMO_REVIEW_DEPOSIT_WEI", uint256(0.4 ether));
        bool fireReview = vm.envOr("SEED_FIRE_REVIEW", false);

        AgentGuardVault vault = AgentGuardVault(payable(vaultAddr));
        address deployer = msg.sender;

        address[] memory allowed = new address[](1);
        allowed[0] = recipient;
        string[] memory blocked = new string[](2);
        blocked[0] = "drain";
        blocked[1] = "rug";

        uint256 maxSpend = deposit_ / 2;           // policy says: 50% of vault max per action

        vm.startBroadcast();

        vault.createPolicy(deployer, maxSpend, 5000, 24 hours, allowed, blocked);
        vault.deposit{value: deposit_}();

        uint256 a1Value = deposit_ / 4;            // 25% — under policy → APPROVE
        uint256 a2Value = (deposit_ * 9) / 10;     // 90% — over policy → BLOCK
        uint256 a3Value = deposit_ / 20;           // 5%  — under policy but to an unknown dApp → REVIEW

        uint256 a1 = vault.proposeAction(deployer, recipient, a1Value, "", "pay invoice for compute", "");
        uint256 a2 = vault.proposeAction(deployer, drainer, a2Value, "", "withdraw funds", "");
        uint256 a3 = vault.proposeAction(deployer, unknownDapp, a3Value, hex"deadbeef", "swap on unknown dex", evidenceUrl);

        if (fireReview) {
            vault.requestAgentReview{value: reviewDeposit}(a1);
            vault.requestAgentReview{value: reviewDeposit}(a2);
            vault.requestAgentReview{value: reviewDeposit}(a3);
        }

        vm.stopBroadcast();

        console.log("Seeded vault:", vaultAddr);
        console.log(" #1 safe payment    actionId =", a1);
        console.log(" #2 suspicious drain actionId =", a2);
        console.log(" #3 ambiguous action actionId =", a3);
        if (fireReview) {
            console.log("Review requested on all three.");
        } else {
            console.log("Skipped review dispatch (set SEED_FIRE_REVIEW=1 to enable).");
        }
    }
}
