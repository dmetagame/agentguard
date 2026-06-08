export const AgentGuardVaultAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_platform",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_inferenceAgentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_parseAgentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "actions",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "target",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "reason",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "evidenceUrl",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "decision",
        "type": "uint8",
        "internalType": "enum AgentGuardVault.Decision"
      },
      {
        "name": "score",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "explanation",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "parsedEvidence",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "stage",
        "type": "uint8",
        "internalType": "enum AgentGuardVault.ActionStage"
      },
      {
        "name": "parseRequestId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "inferenceRequestId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "createdAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "decidedAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balances",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelAction",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createPolicy",
    "inputs": [
      {
        "name": "agent",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "maxSpend",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxRatioBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "reviewTimelock",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "allowedTargets",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "blockedKeywords",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "executableAt",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "executeAction",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ok",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "ret",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAction",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct AgentGuardVault.Action",
        "components": [
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "target",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "value",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "reason",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "evidenceUrl",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "decision",
            "type": "uint8",
            "internalType": "enum AgentGuardVault.Decision"
          },
          {
            "name": "score",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "explanation",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "parsedEvidence",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "stage",
            "type": "uint8",
            "internalType": "enum AgentGuardVault.ActionStage"
          },
          {
            "name": "parseRequestId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "inferenceRequestId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "decidedAt",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPolicy",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct AgentGuardVault.Policy",
        "components": [
          {
            "name": "agent",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "maxSpend",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxRatioBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "reviewTimelock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "allowedTargets",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "blockedKeywords",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "exists",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "handleResponse",
    "inputs": [
      {
        "name": "requestId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "responses",
        "type": "tuple[]",
        "internalType": "struct Response[]",
        "components": [
          {
            "name": "validator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "result",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ResponseStatus"
          },
          {
            "name": "receipt",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executionCost",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum ResponseStatus"
      },
      {
        "name": "details",
        "type": "tuple",
        "internalType": "struct Request",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "requester",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "agentId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "callbackAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "callbackSelector",
            "type": "bytes4",
            "internalType": "bytes4"
          },
          {
            "name": "payload",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "subcommittee",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "responses",
            "type": "tuple[]",
            "internalType": "struct Response[]",
            "components": [
              {
                "name": "validator",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "result",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "status",
                "type": "uint8",
                "internalType": "enum ResponseStatus"
              },
              {
                "name": "receipt",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "timestamp",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "executionCost",
                "type": "uint256",
                "internalType": "uint256"
              }
            ]
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ResponseStatus"
          },
          {
            "name": "consensusType",
            "type": "uint8",
            "internalType": "enum ConsensusType"
          },
          {
            "name": "threshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timeout",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deposit",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "inferenceAgentId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextActionId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "parseAgentId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "platform",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract ISomniaAgentPlatform"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "policies",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "agent",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "maxSpend",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxRatioBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "reviewTimelock",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "exists",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "proposeAction",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "target",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "reason",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "evidenceUrl",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestAgentReview",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "requestToAction",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ActionCancelled",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ActionDecided",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "decision",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum AgentGuardVault.Decision"
      },
      {
        "name": "score",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "explanation",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ActionExecuted",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "success",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "returnData",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ActionProposed",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "target",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Deposited",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InferenceRequested",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "requestId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ParseRequested",
    "inputs": [
      {
        "name": "actionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "requestId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PolicyCreated",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "agent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "maxSpend",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ConsensusFailed",
    "inputs": [
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum ResponseStatus"
      }
    ]
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MalformedResult",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAgent",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotApproved",
    "inputs": [
      {
        "name": "actual",
        "type": "uint8",
        "internalType": "enum AgentGuardVault.Decision"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotPlatform",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PolicyMissing",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReviewTimelockPending",
    "inputs": [
      {
        "name": "readyAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownAction",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WrongStage",
    "inputs": [
      {
        "name": "actual",
        "type": "uint8",
        "internalType": "enum AgentGuardVault.ActionStage"
      }
    ]
  }
] as const;
