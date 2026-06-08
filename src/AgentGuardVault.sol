// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {
    ISomniaAgentPlatform,
    Response,
    Request,
    ResponseStatus,
    ConsensusType
} from "./interfaces/ISomniaAgentPlatform.sol";

/// Subset of the Somnia LLM Inference Agent's interface — we only need the
/// `inferString` selector. The agent runs Qwen3-30B with fixed seed + temp=0,
/// and with a non-empty `allowedValues` array the response is a deterministic
/// classification: byte-identical across the validator subcommittee.
interface ILLMAgent {
    function inferString(
        string calldata prompt,
        string calldata systemPrompt,
        bool chainOfThought,
        string[] calldata allowedValues
    ) external returns (string memory);
}

/// AgentGuardVault — programmable safety layer for autonomous AI wallets.
/// Every action proposed by a user's agent is reviewed by Somnia Agents
/// (LLM Inference + optional Parse-Website) before the vault executes it.
contract AgentGuardVault {
    enum Decision {
        None,
        Block,
        Review,
        Approve
    }

    enum ActionStage {
        Proposed,
        ParsePending,
        InferencePending,
        Decided,
        Executed,
        Cancelled
    }

    struct Policy {
        address agent;
        uint256 maxSpend;
        uint256 maxRatioBps;
        uint256 reviewTimelock;
        address[] allowedTargets;
        string[] blockedKeywords;
        bool exists;
    }

    struct Action {
        address owner;
        address target;
        uint256 value;
        bytes data;
        string reason;
        string evidenceUrl;
        Decision decision;
        uint8 score;
        string explanation;
        string parsedEvidence;
        ActionStage stage;
        uint256 parseRequestId;
        uint256 inferenceRequestId;
        uint256 createdAt;
        uint256 decidedAt;
    }

    string private constant SYSTEM_PROMPT =
        "You are AgentGuard, a deterministic safety reviewer for autonomous AI agents on Somnia. "
        "Decide whether the proposed action is safe to execute given the user's policy. "
        "Reply with exactly one word: APPROVE, REVIEW, or BLOCK.";

    /// Somnia's `getRequestDeposit()` returns only the *operational* fee
    /// (0.03 STT). The full deposit must also cover `pricePerAgent ×
    /// subcommitteeSize`. Under-funded requests are silently dropped — the
    /// platform marks them RequestNotFound and the callback never fires.
    /// These budgets cover the default 3-validator subcommittee with margin;
    /// excess is rebated back to the vault via `receive()`.
    uint256 private constant INFERENCE_BUDGET = 0.25 ether; // LLM Inference: 0.03 base + 0.07×3 + margin
    uint256 private constant PARSE_BUDGET = 0.35 ether;     // Parse Website: 0.03 base + 0.10×3 + margin

    ISomniaAgentPlatform public immutable platform;
    uint256 public immutable inferenceAgentId;
    uint256 public immutable parseAgentId;

    uint256 public nextActionId = 1;
    mapping(address => Policy) public policies;
    mapping(address => uint256) public balances;
    mapping(uint256 => Action) public actions;
    mapping(uint256 => uint256) public requestToAction;

    event PolicyCreated(address indexed owner, address indexed agent, uint256 maxSpend);
    event Deposited(address indexed owner, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event ActionProposed(uint256 indexed actionId, address indexed owner, address target, uint256 value);
    event ParseRequested(uint256 indexed actionId, uint256 indexed requestId);
    event InferenceRequested(uint256 indexed actionId, uint256 indexed requestId);
    event ActionDecided(uint256 indexed actionId, Decision decision, uint8 score, string explanation);
    event ActionExecuted(uint256 indexed actionId, bool success, bytes returnData);
    event ActionCancelled(uint256 indexed actionId);

    error NotPlatform();
    error NotOwner();
    error NotAgent();
    error PolicyMissing();
    error UnknownAction();
    error InsufficientBalance();
    error WrongStage(ActionStage actual);
    error NotApproved(Decision actual);
    error ReviewTimelockPending(uint256 readyAt);
    error ConsensusFailed(ResponseStatus status);
    error MalformedResult();

    modifier onlyPlatform() {
        if (msg.sender != address(platform)) revert NotPlatform();
        _;
    }

    constructor(address _platform, uint256 _inferenceAgentId, uint256 _parseAgentId) {
        platform = ISomniaAgentPlatform(_platform);
        inferenceAgentId = _inferenceAgentId;
        parseAgentId = _parseAgentId;
    }

    // --- vault management -------------------------------------------------

    function createPolicy(
        address agent,
        uint256 maxSpend,
        uint256 maxRatioBps,
        uint256 reviewTimelock,
        address[] calldata allowedTargets,
        string[] calldata blockedKeywords
    ) external {
        policies[msg.sender] = Policy({
            agent: agent,
            maxSpend: maxSpend,
            maxRatioBps: maxRatioBps,
            reviewTimelock: reviewTimelock,
            allowedTargets: allowedTargets,
            blockedKeywords: blockedKeywords,
            exists: true
        });
        emit PolicyCreated(msg.sender, agent, maxSpend);
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        balances[msg.sender] -= amount;
        emit Withdrawn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "withdraw failed");
    }

    // --- action lifecycle -------------------------------------------------

    function proposeAction(
        address owner,
        address target,
        uint256 value,
        bytes calldata data,
        string calldata reason,
        string calldata evidenceUrl
    ) external returns (uint256 actionId) {
        Policy storage p = policies[owner];
        if (!p.exists) revert PolicyMissing();
        if (msg.sender != owner && msg.sender != p.agent) revert NotAgent();
        if (balances[owner] < value) revert InsufficientBalance();

        actionId = nextActionId++;
        Action storage a = actions[actionId];
        a.owner = owner;
        a.target = target;
        a.value = value;
        a.data = data;
        a.reason = reason;
        a.evidenceUrl = evidenceUrl;
        a.stage = ActionStage.Proposed;
        a.createdAt = block.timestamp;

        emit ActionProposed(actionId, owner, target, value);
    }

    /// Funds and dispatches the agent review. If evidenceUrl is set, the
    /// Parse-Website agent runs first; its callback then fires the LLM
    /// Inference agent with the parsed dApp metadata appended to the prompt.
    function requestAgentReview(uint256 actionId) external payable {
        Action storage a = actions[actionId];
        if (a.owner == address(0)) revert UnknownAction();
        if (a.stage != ActionStage.Proposed) revert WrongStage(a.stage);

        if (bytes(a.evidenceUrl).length > 0) {
            uint256 reqId = _dispatchParse(actionId, a.evidenceUrl);
            a.parseRequestId = reqId;
            a.stage = ActionStage.ParsePending;
            emit ParseRequested(actionId, reqId);
        } else {
            uint256 reqId = _dispatchInference(actionId, a, "");
            a.inferenceRequestId = reqId;
            a.stage = ActionStage.InferencePending;
            emit InferenceRequested(actionId, reqId);
        }
    }

    function cancelAction(uint256 actionId) external {
        Action storage a = actions[actionId];
        if (msg.sender != a.owner) revert NotOwner();
        if (a.stage == ActionStage.Executed) revert WrongStage(a.stage);
        a.stage = ActionStage.Cancelled;
        emit ActionCancelled(actionId);
    }

    function executeAction(uint256 actionId) external returns (bool ok, bytes memory ret) {
        Action storage a = actions[actionId];
        if (msg.sender != a.owner) revert NotOwner();
        if (a.stage != ActionStage.Decided) revert WrongStage(a.stage);
        if (a.decision == Decision.Block || a.decision == Decision.None) revert NotApproved(a.decision);
        if (a.decision == Decision.Review) {
            uint256 readyAt = a.decidedAt + policies[a.owner].reviewTimelock;
            if (block.timestamp < readyAt) revert ReviewTimelockPending(readyAt);
        }
        if (balances[a.owner] < a.value) revert InsufficientBalance();

        balances[a.owner] -= a.value;
        a.stage = ActionStage.Executed;
        (ok, ret) = a.target.call{value: a.value}(a.data);
        emit ActionExecuted(actionId, ok, ret);
    }

    // --- Somnia callback --------------------------------------------------

    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory details
    ) external onlyPlatform {
        uint256 actionId = requestToAction[requestId];
        if (actionId == 0) revert UnknownAction();
        Action storage a = actions[actionId];

        if (status != ResponseStatus.Success) revert ConsensusFailed(status);
        bytes memory result = _pickConsensusResult(responses);

        if (details.agentId == parseAgentId) {
            string memory parsed = abi.decode(result, (string));
            a.parsedEvidence = parsed;
            uint256 nextId = _dispatchInference(actionId, a, parsed);
            a.inferenceRequestId = nextId;
            a.stage = ActionStage.InferencePending;
            emit InferenceRequested(actionId, nextId);
        } else if (details.agentId == inferenceAgentId) {
            string memory verdict = abi.decode(result, (string));
            Decision dec = _parseVerdict(verdict);
            if (dec == Decision.None) revert MalformedResult();
            a.decision = dec;
            a.explanation = verdict;
            a.stage = ActionStage.Decided;
            a.decidedAt = block.timestamp;
            emit ActionDecided(actionId, dec, 0, verdict);
        } else {
            revert MalformedResult();
        }
    }

    // --- internals --------------------------------------------------------

    function _dispatchParse(uint256 actionId, string memory url) internal returns (uint256 reqId) {
        // The Parse-Website agent currently exposes a string-returning entrypoint;
        // we send the URL + an extraction instruction and decode `(string)` on callback.
        bytes memory payload = abi.encode(
            url,
            "Extract dApp identity, declared purpose, audit status, and any red flags as a concise paragraph."
        );
        reqId = platform.createRequest{value: PARSE_BUDGET}(
            parseAgentId,
            address(this),
            this.handleResponse.selector,
            payload
        );
        requestToAction[reqId] = actionId;
    }

    function _dispatchInference(uint256 actionId, Action storage a, string memory parsedEvidence)
        internal
        returns (uint256 reqId)
    {
        Policy storage p = policies[a.owner];
        string memory prompt = _buildPolicyPrompt(a, p, parsedEvidence);

        string[] memory allowed = new string[](3);
        allowed[0] = "APPROVE";
        allowed[1] = "REVIEW";
        allowed[2] = "BLOCK";

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferString.selector,
            prompt,
            SYSTEM_PROMPT,
            false, // chainOfThought
            allowed
        );

        reqId = platform.createRequest{value: INFERENCE_BUDGET}(
            inferenceAgentId,
            address(this),
            this.handleResponse.selector,
            payload
        );
        requestToAction[reqId] = actionId;
    }

    function _buildPolicyPrompt(Action storage a, Policy storage p, string memory parsedEvidence)
        internal
        view
        returns (string memory)
    {
        string memory header = string.concat(
            "ACTION:\n",
            "  target: ", _toHex(a.target), "\n",
            "  value (wei): ", _toString(a.value), "\n",
            "  calldata bytes: ", _toString(a.data.length), "\n",
            "  reason: ", a.reason, "\n",
            "  evidence: ", bytes(parsedEvidence).length == 0 ? "(none)" : parsedEvidence, "\n"
        );
        string memory policyBlock = string.concat(
            "POLICY:\n",
            "  max spend (wei): ", _toString(p.maxSpend), "\n",
            "  max ratio bps: ", _toString(p.maxRatioBps), "\n",
            "  vault balance (wei): ", _toString(balances[a.owner]), "\n",
            "  allowed targets: ", _joinAddresses(p.allowedTargets), "\n",
            "  blocked keywords: ", _joinStrings(p.blockedKeywords), "\n"
        );
        return string.concat(header, policyBlock,
            "\nDecide: APPROVE if action matches policy and looks safe. "
            "BLOCK if it violates policy or looks malicious. "
            "REVIEW if uncertain."
        );
    }

    function _parseVerdict(string memory v) internal pure returns (Decision) {
        bytes32 h = keccak256(bytes(v));
        if (h == keccak256("APPROVE")) return Decision.Approve;
        if (h == keccak256("REVIEW")) return Decision.Review;
        if (h == keccak256("BLOCK")) return Decision.Block;
        return Decision.None;
    }

    function _pickConsensusResult(Response[] memory responses) internal pure returns (bytes memory) {
        require(responses.length > 0, "no responses");
        bytes32 winnerHash;
        uint256 winnerCount;
        uint256 winnerIdx;
        for (uint256 i = 0; i < responses.length; i++) {
            bytes32 h = keccak256(responses[i].result);
            uint256 count = 1;
            for (uint256 j = 0; j < responses.length; j++) {
                if (i == j) continue;
                if (keccak256(responses[j].result) == h) count++;
            }
            if (count > winnerCount) {
                winnerCount = count;
                winnerHash = h;
                winnerIdx = i;
            }
        }
        return responses[winnerIdx].result;
    }

    // --- string helpers (minimal, avoids extra dep) -----------------------

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 temp = v;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buf = new bytes(digits);
        while (v != 0) { digits--; buf[digits] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(buf);
    }

    function _toHex(address a) internal pure returns (string memory) {
        bytes memory buf = new bytes(42);
        buf[0] = "0"; buf[1] = "x";
        uint160 v = uint160(a);
        for (uint256 i = 0; i < 20; i++) {
            uint8 b = uint8(v >> (8 * (19 - i)));
            buf[2 + i * 2] = _nibble(b >> 4);
            buf[3 + i * 2] = _nibble(b & 0x0f);
        }
        return string(buf);
    }

    function _nibble(uint8 n) private pure returns (bytes1) {
        return bytes1(n < 10 ? n + 48 : n + 87);
    }

    function _joinAddresses(address[] memory xs) internal pure returns (string memory out) {
        if (xs.length == 0) return "(empty)";
        out = _toHex(xs[0]);
        for (uint256 i = 1; i < xs.length; i++) {
            out = string.concat(out, ", ", _toHex(xs[i]));
        }
    }

    function _joinStrings(string[] memory xs) internal pure returns (string memory out) {
        if (xs.length == 0) return "(empty)";
        out = xs[0];
        for (uint256 i = 1; i < xs.length; i++) {
            out = string.concat(out, ", ", xs[i]);
        }
    }

    // --- views ------------------------------------------------------------

    function getAction(uint256 actionId) external view returns (Action memory) {
        return actions[actionId];
    }

    function getPolicy(address owner) external view returns (Policy memory) {
        return policies[owner];
    }

    /// Returns the timestamp at which `actionId` becomes executable.
    /// 0 means executable now (or never — caller checks decision).
    function executableAt(uint256 actionId) external view returns (uint256) {
        Action storage a = actions[actionId];
        if (a.stage != ActionStage.Decided) return type(uint256).max;
        if (a.decision == Decision.Approve) return 0;
        if (a.decision == Decision.Review) return a.decidedAt + policies[a.owner].reviewTimelock;
        return type(uint256).max;
    }

    receive() external payable {}
}
