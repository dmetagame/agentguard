// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

enum ConsensusType {
    Majority,
    Threshold
}

enum ResponseStatus {
    None,
    Pending,
    Success,
    Failed,
    TimedOut
}

struct Response {
    address validator;
    bytes result;
    ResponseStatus status;
    bytes receipt;
    uint256 timestamp;
    uint256 executionCost;
}

struct Request {
    uint256 id;
    address requester;
    uint256 agentId;
    address callbackAddress;
    bytes4 callbackSelector;
    bytes payload;
    address[] subcommittee;
    Response[] responses;
    ResponseStatus status;
    ConsensusType consensusType;
    uint256 threshold;
    uint256 timeout;
    uint256 deposit;
}

interface ISomniaAgentPlatform {
    function createRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload
    ) external payable returns (uint256 requestId);

    function createAdvancedRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload,
        uint256 subcommitteeSize,
        uint256 threshold,
        ConsensusType consensusType,
        uint256 timeout
    ) external payable returns (uint256 requestId);

    function getRequest(uint256 requestId) external view returns (Request memory);

    function getRequestDeposit() external view returns (uint256);

    function getAdvancedRequestDeposit(uint256 subcommitteeSize) external view returns (uint256);
}
