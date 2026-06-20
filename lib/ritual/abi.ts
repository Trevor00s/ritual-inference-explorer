import { parseAbiParameters } from "viem";

// All field layouts verified against skills/ritual-dapp-precompiles/SKILL.md and
// confirmed by decoding live transactions on chain 1979.

// ---- HTTP (0x0801) — 13 fields ----
export const HTTP_INPUT = parseAbiParameters(
  "address executor, bytes[] encryptedSecrets, uint256 ttl, bytes[] secretSignatures, bytes userPublicKey, string url, uint8 method, string[] headerKeys, string[] headerValues, bytes body, uint256 dkmsKeyIndex, uint8 dkmsKeyFormat, uint8 piiEnabled",
);
export const HTTP_OUTPUT = parseAbiParameters(
  "uint16 statusCode, string[] headerKeys, string[] headerValues, bytes body, string errorMessage",
);

// ---- LLM (0x0802) — 30 fields ----
export const LLM_INPUT = parseAbiParameters(
  "address executor, bytes[] encryptedSecrets, uint256 ttl, bytes[] secretSignatures, bytes userPublicKey, string messagesJson, string model, int256 frequencyPenalty, string logitBiasJson, uint8 logprobs, int256 maxCompletionTokens, string metadataJson, string modalitiesJson, uint256 n, uint8 parallelToolCalls, int256 presencePenalty, string reasoningEffort, bytes responseFormatData, int256 seed, string serviceTier, string stopJson, uint8 stream, int256 temperature, bytes toolChoiceData, bytes toolsData, int256 topLogprobs, int256 topP, string user, uint8 piiEnabled, (string,string,string) convoHistory",
);
export const LLM_OUTPUT = parseAbiParameters(
  "uint8 hasError, bytes completionData, bytes modelMetadata, string errorMessage, (string,string,string) updatedConvoHistory",
);
export const COMPLETION_DATA = parseAbiParameters(
  "string id, string object, uint256 created, string model, string systemFingerprint, string serviceTier, uint256 choicesCount, bytes[] choicesData, bytes usageData",
);
export const USAGE_DATA = parseAbiParameters(
  "uint256 promptTokens, uint256 completionTokens, uint256 totalTokens",
);
export const CHOICE_DATA = parseAbiParameters(
  "uint256 index, string finishReason, bytes messageData",
);
export const MESSAGE_DATA = parseAbiParameters(
  "string role, string content, string refusal, uint256 toolCallsCount, bytes[] toolCallsData",
);

// ---- DKMS (0x081B) — 8 fields ----
export const DKMS_INPUT = parseAbiParameters(
  "address executor, bytes[] encryptedSecrets, uint256 ttl, bytes[] secretSignatures, bytes userPublicKey, address owner, uint256 keyIndex, uint8 keyFormat",
);
export const DKMS_OUTPUT = parseAbiParameters("address derivedAddress, bytes publicKey");

// ---- Sovereign Agent (0x080C) — 23 fields (distinct base) ----
export const SOVEREIGN_AGENT_INPUT = parseAbiParameters(
  "address executor, uint256 ttl, bytes userPublicKey, uint64 pollIntervalBlocks, uint64 maxPollBlock, string taskIdMarker, address deliveryTarget, bytes4 deliverySelector, uint256 deliveryGasLimit, uint256 deliveryMaxFeePerGas, uint256 deliveryMaxPriorityFeePerGas, uint16 cliType, string prompt, bytes encryptedSecrets, (string,string,string) convoHistory, (string,string,string) output, (string,string,string)[] skills, (string,string,string) systemPrompt, string model, string[] tools, uint16 maxTurns, uint32 maxTokens, string rpcUrls",
);

// ---- Persistent Agent (0x0820) — 26 fields ----
export const PERSISTENT_AGENT_INPUT = parseAbiParameters(
  "address executor, bytes[] encryptedSecrets, uint256 ttl, bytes[] secretSignatures, bytes userPublicKey, uint64 maxSpawnBlock, address deliveryTarget, bytes4 deliverySelector, uint256 deliveryGasLimit, uint256 deliveryMaxFeePerGas, uint256 deliveryMaxPriorityFeePerGas, uint256 deliveryValue, uint8 provider, string model, string llmApiKeyRef, (string,string,string) daConfig, (string,string,string) soulRef, (string,string,string) agentsRef, (string,string,string) userRef, (string,string,string) memoryRef, (string,string,string) identityRef, (string,string,string) toolsRef, (string,string,string) openclawConfigRef, string restoreFromCid, string rpcUrls, uint16 agentRuntime",
);

// ---- Image / Audio / Video (0x0818 / 0x0819 / 0x081A) — 18 fields ----
export const MODAL_INPUT_OUTPUT = parseAbiParameters(
  "address executor, bytes[] encryptedSecrets, uint256 ttl, bytes[] secretSignatures, bytes userPublicKey, uint64 pollIntervalBlocks, uint64 maxPollBlock, string taskIdMarker, address deliveryTarget, bytes4 deliverySelector, uint256 deliveryGasLimit, uint256 deliveryMaxFeePerGas, uint256 deliveryMaxPriorityFeePerGas, uint256 deliveryValue, string model, (uint8,bytes,string,bytes32,uint32,uint32,uint8)[] inputs, (uint8,uint32,uint32,uint32,uint8,uint16,uint16,uint32,uint8,string) outputConfig, (string,string,string) outputStorageRef",
);

// ---- ZK (0x0806) — 14 fields ----
export const ZK_INPUT = parseAbiParameters(
  "address executor, bytes[] encryptedSecrets, uint256 ttl, bytes[] secretSignatures, bytes userPublicKey, uint8 inputEncrypted, uint64 maxProofBlock, address deliveryTarget, bytes4 deliverySelector, uint256 deliveryGasLimit, uint256 deliveryMaxFeePerGas, uint256 deliveryMaxPriorityFeePerGas, uint256 deliveryValue, bytes operationInput",
);

// ---- FHE (0x0807) — 19 fields ----
export const FHE_INPUT = parseAbiParameters(
  "address executor, bytes[] encryptedSecrets, uint256 ttl, bytes[] secretSignatures, bytes userPublicKey, string model, bytes encryptedInput, bytes encryptedInputRef, bytes evkReference, uint8 numLayers, uint64 maxInferenceBlock, address deliveryTarget, bytes4 deliverySelector, uint256 deliveryGasLimit, uint256 deliveryMaxFeePerGas, uint256 deliveryMaxPriorityFeePerGas, uint256 deliveryValue, bytes encryptedInputStorage, bytes encryptedOutputStorage",
);

// ---- Long-Running HTTP (0x0805) — 35 fields ----
export const LONG_HTTP_INPUT = parseAbiParameters(
  "address executor, bytes[] encryptedSecrets, uint256 ttl, bytes[] secretSignatures, bytes userPublicKey, uint64 pollIntervalBlocks, uint64 maxPollBlock, string taskIdMarker, address deliveryTarget, bytes4 deliverySelector, uint256 deliveryGasLimit, uint256 deliveryMaxFeePerGas, uint256 deliveryMaxPriorityFeePerGas, uint256 deliveryValue, string url, uint8 method, string[] headerKeys, string[] headerValues, bytes body, string taskIdJsonPath, string pollUrl, uint8 pollMethod, string[] pollHeaderKeys, string[] pollHeaderValues, bytes pollBody, string statusJsonPath, string resultUrl, uint8 resultMethod, string[] resultHeaderKeys, string[] resultHeaderValues, bytes resultBody, string resultJsonPath, uint256 dkmsKeyIndex, uint8 dkmsKeyFormat, uint8 piiEnabled",
);

export const HTTP_METHODS: Record<number, string> = {
  1: "GET",
  2: "POST",
  3: "PUT",
  4: "DELETE",
  5: "PATCH",
  6: "HEAD",
  7: "OPTIONS",
};

export const CLI_TYPES: Record<number, string> = {
  0: "claude_code",
  5: "crush",
  6: "zeroclaw",
};

export const AGENT_PROVIDERS: Record<number, string> = {
  0: "anthropic",
  1: "openai",
  2: "gemini",
  3: "xai",
  4: "openrouter",
};
