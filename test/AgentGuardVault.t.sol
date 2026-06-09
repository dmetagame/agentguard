// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {AgentGuardVault} from "../src/AgentGuardVault.sol";
import {
    ISomniaAgentPlatform,
    Response,
    Request,
    ResponseStatus,
    ConsensusType
} from "../src/interfaces/ISomniaAgentPlatform.sol";

contract MockPlatform is ISomniaAgentPlatform {
    uint256 public nextRequestId = 1;
    mapping(uint256 => Request) internal _requests;
    uint256 public depositPerRequest = 0.21 ether;

    function createRequest(
        uint256, /*agentId*/
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata /*payload*/
    ) external payable returns (uint256 reqId) {
        reqId = nextRequestId++;
        Request storage r = _requests[reqId];
        r.id = reqId;
        r.requester = msg.sender;
        r.callbackAddress = callbackAddress;
        r.callbackSelector = callbackSelector;
    }

    function hasRequest(uint256 id) external view returns (bool) {
        return _requests[id].id != 0;
    }

    function createAdvancedRequest(
        uint256, address, bytes4, bytes calldata, uint256, uint256, ConsensusType, uint256
    ) external payable returns (uint256) {
        revert("unused");
    }

    function getRequest(uint256 id) external view returns (Request memory) {
        return _requests[id];
    }

    function getRequestDeposit() external view returns (uint256) {
        return depositPerRequest;
    }

    function getAdvancedRequestDeposit(uint256) external pure returns (uint256) {
        return 0;
    }

    function deliver(uint256 reqId, bytes memory result, ResponseStatus status) external {
        Request storage r = _requests[reqId];
        Response[] memory responses = new Response[](3);
        for (uint256 i = 0; i < 3; i++) {
            responses[i] = Response({
                validator: address(uint160(i + 1)),
                result: result,
                status: status,
                receipt: 0,
                timestamp: block.timestamp,
                executionCost: 0
            });
        }
        Request memory details = r;
        (bool ok, ) = r.callbackAddress.call(
            abi.encodeWithSelector(r.callbackSelector, reqId, responses, status, details)
        );
        require(ok, "callback failed");
    }
}

contract AgentGuardVaultTest is Test {
    AgentGuardVault vault;
    MockPlatform platform;
    address user = makeAddr("user");
    address agent = makeAddr("agent");
    address recipient = makeAddr("recipient");
    uint256 constant INFERENCE_ID = 1001;
    uint256 constant PARSE_ID = 1002;

    function setUp() public {
        platform = new MockPlatform();
        vault = new AgentGuardVault(address(platform), INFERENCE_ID, PARSE_ID);
        vm.deal(user, 100 ether);
        vm.deal(address(this), 100 ether);
    }

    uint256 constant REVIEW_TIMELOCK = 24 hours;

    function _setupVault() internal {
        address[] memory allowed = new address[](1);
        allowed[0] = recipient;
        string[] memory blocked = new string[](0);

        vm.startPrank(user);
        vault.createPolicy(agent, 50 ether, 5000, REVIEW_TIMELOCK, allowed, blocked);
        vault.deposit{value: 50 ether}();
        vm.stopPrank();
    }

    function test_safePayment_approved() public {
        _setupVault();

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(user, recipient, 10 ether, "", "pay invoice", "");

        vm.prank(user);
        vault.requestAgentReview{value: 1 ether}(actionId);

        platform.deliver(1, abi.encode("APPROVE"), ResponseStatus.Success);

        vm.prank(user);
        (bool ok, ) = vault.executeAction(actionId);
        assertTrue(ok);
        assertEq(recipient.balance, 10 ether);
    }

    function test_suspiciousDrain_blocked() public {
        _setupVault();
        address drainer = makeAddr("drainer");

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(user, drainer, 45 ether, "", "withdraw", "");

        vm.prank(user);
        vault.requestAgentReview{value: 1 ether}(actionId);

        platform.deliver(1, abi.encode("BLOCK"), ResponseStatus.Success);

        vm.expectRevert(
            abi.encodeWithSelector(AgentGuardVault.NotApproved.selector, AgentGuardVault.Decision.Block)
        );
        vm.prank(user);
        vault.executeAction(actionId);
    }

    function test_ambiguousAction_twoAgentComposition() public {
        _setupVault();
        address unknownDapp = makeAddr("unknownDapp");

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(
            user, unknownDapp, 1 ether, hex"deadbeef", "swap on unknown dex", "https://unknown.fi"
        );

        vm.prank(user);
        vault.requestAgentReview{value: 1 ether}(actionId);

        platform.deliver(1, abi.encode("Unknown DEX, no audit, deployed 2 days ago."), ResponseStatus.Success);
        platform.deliver(2, abi.encode("REVIEW"), ResponseStatus.Success);

        AgentGuardVault.Action memory a = vault.getAction(actionId);
        assertEq(uint8(a.decision), uint8(AgentGuardVault.Decision.Review));
        assertEq(a.explanation, "REVIEW");
        assertEq(a.parsedEvidence, "Unknown DEX, no audit, deployed 2 days ago.");

        uint256 readyAt = a.decidedAt + REVIEW_TIMELOCK;
        assertEq(vault.executableAt(actionId), readyAt);

        vm.expectRevert(
            abi.encodeWithSelector(AgentGuardVault.ReviewTimelockPending.selector, readyAt)
        );
        vm.prank(user);
        vault.executeAction(actionId);
    }

    function test_review_executesAfterTimelock() public {
        _setupVault();
        address unknownDapp = makeAddr("unknownDapp");
        vm.deal(unknownDapp, 0);

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(
            user, unknownDapp, 1 ether, "", "interact with new dapp", "https://unknown.fi"
        );
        vm.prank(user);
        vault.requestAgentReview{value: 1 ether}(actionId);

        platform.deliver(1, abi.encode("Unverified dApp."), ResponseStatus.Success);
        platform.deliver(2, abi.encode("REVIEW"), ResponseStatus.Success);

        uint256 readyAt = vault.executableAt(actionId);
        vm.warp(readyAt);

        vm.prank(user);
        (bool ok, ) = vault.executeAction(actionId);
        assertTrue(ok);
        assertEq(unknownDapp.balance, 1 ether);
    }

    function test_review_ownerCanCancelDuringTimelock() public {
        _setupVault();

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(
            user, recipient, 1 ether, "", "ambiguous", "https://x.test"
        );
        vm.prank(user);
        vault.requestAgentReview{value: 1 ether}(actionId);
        platform.deliver(1, abi.encode("noisy"), ResponseStatus.Success);
        platform.deliver(2, abi.encode("REVIEW"), ResponseStatus.Success);

        vm.prank(user);
        vault.cancelAction(actionId);

        vm.warp(block.timestamp + REVIEW_TIMELOCK + 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                AgentGuardVault.WrongStage.selector, AgentGuardVault.ActionStage.Cancelled
            )
        );
        vm.prank(user);
        vault.executeAction(actionId);
    }

    function test_block_neverExecutesEvenAfterTimelock() public {
        _setupVault();
        address drainer = makeAddr("drainer");

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(user, drainer, 45 ether, "", "drain", "");
        vm.prank(user);
        vault.requestAgentReview{value: 1 ether}(actionId);
        platform.deliver(1, abi.encode("BLOCK"), ResponseStatus.Success);

        assertEq(vault.executableAt(actionId), type(uint256).max);
        vm.warp(block.timestamp + 365 days);
        vm.expectRevert(
            abi.encodeWithSelector(AgentGuardVault.NotApproved.selector, AgentGuardVault.Decision.Block)
        );
        vm.prank(user);
        vault.executeAction(actionId);
    }

    function test_onlyPlatformCanCallback() public {
        _setupVault();
        Response[] memory empty = new Response[](0);
        Request memory details;
        vm.expectRevert(AgentGuardVault.NotPlatform.selector);
        vault.handleResponse(1, empty, ResponseStatus.Success, details);
    }

    // --- new invariants ---------------------------------------------------

    /// Only the owner or their authorized agent may trigger a review — a
    /// stranger can't fire reviews on someone else's action to drain the vault.
    function test_requestReview_rejectsStranger() public {
        _setupVault();
        vm.prank(agent);
        uint256 actionId = vault.proposeAction(user, recipient, 10 ether, "", "pay", "");

        address stranger = makeAddr("stranger");
        vm.deal(stranger, 10 ether);
        vm.prank(stranger);
        vm.expectRevert(AgentGuardVault.NotAgent.selector);
        vault.requestAgentReview{value: 1 ether}(actionId);
    }

    /// Agent fees are debited from the owner's vault balance, so the sum of
    /// all balances never exceeds the contract's actual ETH — the vault stays
    /// solvent and every depositor can withdraw what they're owed.
    function test_reviewFees_keepVaultSolvent() public {
        _setupVault(); // user deposits 50 ether

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(
            user, recipient, 1 ether, "", "swap", "https://x.test"
        );

        // No extra msg.value: the parse + inference budgets come straight out
        // of the owner's accounted balance.
        vm.prank(user);
        vault.requestAgentReview(actionId);
        platform.deliver(1, abi.encode("noisy"), ResponseStatus.Success); // parse -> inference
        platform.deliver(2, abi.encode("APPROVE"), ResponseStatus.Success);

        // 50 ether deposit minus the 0.35 parse + 0.21 inference fees (mock
        // charges its depositPerRequest = 0.21 for the value sent).
        uint256 owed = vault.balances(user);
        assertEq(owed, 50 ether - 0.35 ether - 0.25 ether);
        assertLe(owed, address(vault).balance); // solvency invariant
    }

    /// maxSpend is a hard on-chain cap the LLM verdict cannot override: even an
    /// APPROVE can't move more than the policy allows.
    function test_maxSpend_hardCapsEvenOnApprove() public {
        _setupVault(); // maxSpend = 50 ether

        // Lower the cap to 5 ether, then try to push 10 ether through with an
        // APPROVE verdict.
        address[] memory allowed = new address[](1);
        allowed[0] = recipient;
        string[] memory blocked = new string[](0);
        vm.prank(user);
        vault.createPolicy(agent, 5 ether, 0, REVIEW_TIMELOCK, allowed, blocked);

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(user, recipient, 10 ether, "", "pay", "");
        vm.prank(user);
        vault.requestAgentReview{value: 1 ether}(actionId);
        platform.deliver(1, abi.encode("APPROVE"), ResponseStatus.Success);

        vm.expectRevert(
            abi.encodeWithSelector(AgentGuardVault.ExceedsMaxSpend.selector, 10 ether, 5 ether)
        );
        vm.prank(user);
        vault.executeAction(actionId);
    }

    /// A failed/timed-out review returns the action to Proposed so the owner
    /// can retry — it doesn't strand the action or auto-approve it.
    function test_failedReview_returnsToProposed() public {
        _setupVault();

        vm.prank(agent);
        uint256 actionId = vault.proposeAction(user, recipient, 1 ether, "", "pay", "");
        vm.prank(user);
        vault.requestAgentReview{value: 1 ether}(actionId);

        platform.deliver(1, abi.encode(""), ResponseStatus.Failed);

        AgentGuardVault.Action memory a = vault.getAction(actionId);
        assertEq(uint8(a.stage), uint8(AgentGuardVault.ActionStage.Proposed));
        assertEq(uint8(a.decision), uint8(AgentGuardVault.Decision.None));

        // owner can retry
        vm.prank(user);
        vault.requestAgentReview(actionId);
        a = vault.getAction(actionId);
        assertEq(uint8(a.stage), uint8(AgentGuardVault.ActionStage.InferencePending));
    }
}
