import type { Address } from "viem";
import { AgentGuardVaultAbi } from "./abi";

export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as Address;

export const PLATFORM_ADDRESS = (process.env.NEXT_PUBLIC_SOMNIA_PLATFORM ?? "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776") as Address;

export const Decision = ["None", "Block", "Review", "Approve"] as const;
export type DecisionName = (typeof Decision)[number];

export const Stage = [
  "Proposed",
  "ParsePending",
  "InferencePending",
  "Decided",
  "Executed",
  "Cancelled",
] as const;
export type StageName = (typeof Stage)[number];

export { AgentGuardVaultAbi };
