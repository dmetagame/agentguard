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

/// Parse-Website agent extracts a structured field from a fetched web page.
/// The selector + 8-arg shape is the agent's only callable entrypoint —
/// raw `abi.encode(url, prompt)` is rejected by validators at decode time
/// (RequestFinalized with status=Failed within seconds of creation).
interface IParseWebsiteAgent {
    function ExtractString(
        string memory key,
        string memory description,
        string[] calldata options,
        string memory prompt,
        string memory url,
        bool resolveUrl,
        uint8 numPages,
        uint8 confidenceThreshold
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

    enum RequestKind {
        None,
        Parse,
        Inference
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
    mapping(uint256 => RequestKind) public requestKind;

    event PolicyCreated(address indexed owner, address indexed agent, uint256 maxSpend);
    event Deposited(address indexed owner, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event ActionProposed(uint256 indexed actionId, address indexed owner, address target, uint256 value);
    event ParseRequested(uint256 indexed actionId, uint256 indexed requestId);
    event InferenceRequested(uint256 indexed actionId, uint256 indexed requestId);
    event ActionDecided(uint256 indexed actionId, Decision decision, uint8 score, string explanation);
    event ActionExecuted(uint256 indexed actionId, bool success, bytes returnData);
    event ActionCancelled(uint256 indexed actionId);
    event ReviewFailed(uint256 indexed actionId, ResponseStatus status);
    event ReviewFunded(uint256 indexed actionId, address indexed payer, uint256 amount);

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
    error ExceedsMaxSpend(uint256 value, uint256 maxSpend);
    error ExceedsMaxRatio(uint256 value, uint256 cap);
    error ExecutionFailed(bytes returnData);

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
    ///
    /// Agent fees are charged to the owner's vault balance (see `_dispatch*`),
    /// never to the shared contract pool — so `sum(balances) <=
    /// address(this).balance` always holds and depositors stay solvent. Any
    /// `msg.value` is credited to the owner's balance as a top-up first, so a
    /// caller can fund the review and the action in one transaction. Only the
    /// owner or their authorized agent may trigger a review (it spends the
    /// owner's funds), which closes the griefing vector where anyone could
    /// drain the vault by firing reviews on someone else's actions.
    function requestAgentReview(uint256 actionId) external payable {
        Action storage a = actions[actionId];
        if (a.owner == address(0)) revert UnknownAction();
        Policy storage p = policies[a.owner];
        if (msg.sender != a.owner && msg.sender != p.agent) revert NotAgent();
        if (a.stage != ActionStage.Proposed) revert WrongStage(a.stage);

        if (msg.value > 0) {
            balances[a.owner] += msg.value;
            emit ReviewFunded(actionId, msg.sender, msg.value);
        }

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

        // Deterministic guardrails the LLM verdict cannot override. The
        // target allowlist is intentionally NOT a hard gate here — interacting
        // with a non-allowlisted target is exactly what the REVIEW timelock is
        // for — but absolute value caps always hold, so a model lapse or a
        // prompt-injected evidence page can never move more than the owner's
        // policy permits.
        Policy storage p = policies[a.owner];
        if (p.maxSpend > 0 && a.value > p.maxSpend) revert ExceedsMaxSpend(a.value, p.maxSpend);
        if (p.maxRatioBps > 0) {
            uint256 cap = (balances[a.owner] * p.maxRatioBps) / 10_000;
            if (a.value > cap) revert ExceedsMaxRatio(a.value, cap);
        }

        if (balances[a.owner] < a.value) revert InsufficientBalance();

        balances[a.owner] -= a.value;
        a.stage = ActionStage.Executed;
        (ok, ret) = a.target.call{value: a.value}(a.data);
        // Fail closed: if the call reverts, roll back the whole execution
        // (balance debit + stage change) so funds aren't silently consumed and
        // the owner can retry. `.call` returns the value to us on failure.
        if (!ok) revert ExecutionFailed(ret);
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

        // Fail safe instead of reverting: a reverting callback leaves the
        // action permanently stuck in *Pending (the platform considers the
        // callback delivered either way). Return it to Proposed so the owner
        // can retry — never auto-approve on a failed or timed-out review.
        if (status != ResponseStatus.Success) {
            a.stage = ActionStage.Proposed;
            a.parseRequestId = 0;
            a.inferenceRequestId = 0;
            emit ReviewFailed(actionId, status);
            return;
        }
        bytes memory result = _pickConsensusResult(responses);
        RequestKind kind = requestKind[requestId];

        if (kind == RequestKind.Parse) {
            string memory parsed = abi.decode(result, (string));
            a.parsedEvidence = parsed;
            uint256 nextId = _dispatchInference(actionId, a, parsed);
            a.inferenceRequestId = nextId;
            a.stage = ActionStage.InferencePending;
            emit InferenceRequested(actionId, nextId);
        } else if (kind == RequestKind.Inference) {
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
        details; // silence unused-parameter warning
    }

    // --- internals --------------------------------------------------------

    function _dispatchParse(uint256 actionId, string memory url) internal returns (uint256 reqId) {
        // Charge the agent fee to the owner's vault balance so the spend is
        // always backed by accounted funds (keeps the vault solvent).
        address owner = actions[actionId].owner;
        if (balances[owner] < PARSE_BUDGET) revert InsufficientBalance();
        balances[owner] -= PARSE_BUDGET;

        // ExtractString is built for narrow single-field extractions constrained
        // by an `options` enum — that's how the agent reaches high confidence.
        // We extract one safety signal (audit status) and let the LLM Inference
        // agent weigh it against the rest of the action. Production deployments
        // would chain multiple extractions for richer evidence.
        string[] memory options = new string[](3);
        options[0] = "audited";
        options[1] = "unaudited";
        options[2] = "unknown";
        bytes memory payload = abi.encodeWithSelector(
            IParseWebsiteAgent.ExtractString.selector,
            "audit_status",
            "Whether the protocol described on this page has been formally audited by a security firm.",
            options,
            "Has the protocol or dApp described on this page been audited by a security firm? "
            "Reply 'audited' if yes, 'unaudited' if explicitly not, or 'unknown' if not stated.",
            url,
            false,        // resolveUrl — scrape the given URL directly (callers pass real URLs)
            uint8(1),     // numPages — capped at 1 when resolveUrl=false
            uint8(20)     // confidenceThreshold
        );
        reqId = platform.createRequest{value: PARSE_BUDGET}(
            parseAgentId,
            address(this),
            this.handleResponse.selector,
            payload
        );
        requestToAction[reqId] = actionId;
        requestKind[reqId] = RequestKind.Parse;
    }

    function _dispatchInference(uint256 actionId, Action storage a, string memory parsedEvidence)
        internal
        returns (uint256 reqId)
    {
        // Charge the agent fee to the owner's vault balance (solvency invariant).
        if (balances[a.owner] < INFERENCE_BUDGET) revert InsufficientBalance();
        balances[a.owner] -= INFERENCE_BUDGET;

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
        requestKind[reqId] = RequestKind.Inference;
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

    /// Returns the result agreed on by a strict majority of the subcommittee.
    /// Only `Success` responses are counted, and the winning result must be
    /// held by more than half of all responses — otherwise there's no
    /// consensus and we revert rather than act on a plurality of one.
    function _pickConsensusResult(Response[] memory responses) internal pure returns (bytes memory) {
        uint256 n = responses.length;
        require(n > 0, "no responses");
        bytes memory winner;
        uint256 winnerCount;
        for (uint256 i = 0; i < n; i++) {
            if (responses[i].status != ResponseStatus.Success) continue;
            bytes32 h = keccak256(responses[i].result);
            uint256 count;
            for (uint256 j = 0; j < n; j++) {
                if (responses[j].status == ResponseStatus.Success && keccak256(responses[j].result) == h) {
                    count++;
                }
            }
            if (count > winnerCount) {
                winnerCount = count;
                winner = responses[i].result;
            }
        }
        if (winnerCount * 2 <= n) revert ConsensusFailed(ResponseStatus.Failed);
        return winner;
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
