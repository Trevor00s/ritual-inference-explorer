// Ritual Chain constants + precompile catalog.
// Source of truth: skills/ritual-dapp-precompiles/SKILL.md (verified against live chain id 1979).

export const CHAIN_ID = 1979;
export const RPC_URL =
  process.env.NEXT_PUBLIC_RITUAL_RPC_URL || "https://rpc.ritualfoundation.org";
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_RITUAL_EXPLORER_URL ||
  "https://explorer.ritualfoundation.org";

export const SYSTEM = {
  RITUAL_WALLET: "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948",
  SCHEDULER: "0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B",
  ASYNC_JOB_TRACKER: "0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5",
  ASYNC_DELIVERY: "0x5A16214fF555848411544b005f7Ac063742f39F6",
  TEE_SERVICE_REGISTRY: "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F",
} as const;

// AsyncJobTracker.JobAdded(address indexed sender, bytes32 indexed jobId, address indexed precompile, ...)
// topic0 verified empirically against the live chain.
export const JOB_ADDED_TOPIC0 =
  "0xdc816fe478e06924e13d5c802912a8d7931e9a96b8443fe00d3f27c2da756cdf";

export type ExecKind = "sync" | "short" | "long";
export type Group = "ai" | "io" | "crypto";
export type Accent = "pink" | "lime" | "green" | "gold" | "red";

export interface PrecompileMeta {
  /** 20-byte lowercase address, e.g. 0x...0802 */
  address: string;
  key: string;
  label: string;
  /** short badge text */
  badge: string;
  glyph: string;
  kind: ExecKind;
  group: Group;
  /** semantic accent per design skill: pink=AI, lime=data/io, green=trust/crypto */
  accent: Accent;
  description: string;
  /** does its result land in receipt.spcCalls (short) vs callback (long)? */
  resultInSpcCalls: boolean;
}

/** Normalize any precompile address form to the canonical 0x + 40-hex lowercase. */
export function normAddr(addr: string): string {
  if (!addr) return "";
  let a = addr.toLowerCase();
  if (!a.startsWith("0x")) a = "0x" + a;
  // topics are 32-byte; collapse to 20-byte
  if (a.length > 42) a = "0x" + a.slice(-40);
  if (a.length < 42) a = "0x" + a.slice(2).padStart(40, "0");
  return a;
}

const P = (m: PrecompileMeta) => m;

export const PRECOMPILES: PrecompileMeta[] = [
  P({ address: "0x0000000000000000000000000000000000000802", key: "llm", label: "LLM Inference", badge: "LLM", glyph: "◇", kind: "short", group: "ai", accent: "pink", resultInSpcCalls: true, description: "On-chain frontier LLM completion (zai-org/GLM-4.7-FP8) executed in a TEE." }),
  P({ address: "0x000000000000000000000000000000000000080c", key: "sovereign-agent", label: "Sovereign Agent", badge: "AGENT", glyph: "✦", kind: "long", group: "ai", accent: "pink", resultInSpcCalls: false, description: "CLI-style autonomous agent (Claude Code / ZeroClaw / Crush) running in a TEE." }),
  P({ address: "0x0000000000000000000000000000000000000820", key: "persistent-agent", label: "Persistent Agent", badge: "AGENT+", glyph: "✸", kind: "long", group: "ai", accent: "pink", resultInSpcCalls: false, description: "Stateful agent with soul, memory and DA-backed revival." }),
  P({ address: "0x0000000000000000000000000000000000000818", key: "image", label: "Image Generation", badge: "IMAGE", glyph: "▣", kind: "long", group: "ai", accent: "pink", resultInSpcCalls: false, description: "AI image generation in a TEE; output delivered via callback." }),
  P({ address: "0x0000000000000000000000000000000000000819", key: "audio", label: "Audio Generation", badge: "AUDIO", glyph: "♪", kind: "long", group: "ai", accent: "pink", resultInSpcCalls: false, description: "AI audio generation in a TEE; output delivered via callback." }),
  P({ address: "0x000000000000000000000000000000000000081a", key: "video", label: "Video Generation", badge: "VIDEO", glyph: "►", kind: "long", group: "ai", accent: "pink", resultInSpcCalls: false, description: "AI video generation in a TEE; output delivered via callback." }),
  P({ address: "0x0000000000000000000000000000000000000807", key: "fhe", label: "FHE Inference", badge: "FHE", glyph: "❖", kind: "long", group: "ai", accent: "pink", resultInSpcCalls: false, description: "Inference over CKKS-encrypted tensors; inputs/outputs never in cleartext." }),
  P({ address: "0x0000000000000000000000000000000000000800", key: "onnx", label: "ONNX Inference", badge: "ONNX", glyph: "▤", kind: "sync", group: "ai", accent: "pink", resultInSpcCalls: false, description: "Synchronous classical ML model inference (ONNX) in the node runtime." }),
  P({ address: "0x0000000000000000000000000000000000000801", key: "http", label: "HTTP Call", badge: "HTTP", glyph: "↯", kind: "short", group: "io", accent: "lime", resultInSpcCalls: true, description: "Contract-issued HTTP request executed and attested inside a TEE." }),
  P({ address: "0x0000000000000000000000000000000000000805", key: "long-http", label: "Long-Running HTTP", badge: "HTTP⏳", glyph: "↯", kind: "long", group: "io", accent: "lime", resultInSpcCalls: false, description: "Submit/poll/deliver HTTP for jobs exceeding the short-running budget." }),
  P({ address: "0x0000000000000000000000000000000000000803", key: "jq", label: "JQ Query", badge: "JQ", glyph: "{}", kind: "sync", group: "io", accent: "lime", resultInSpcCalls: false, description: "Synchronous jq transform over a JSON string." }),
  P({ address: "0x0000000000000000000000000000000000000806", key: "zk", label: "ZK Proof", badge: "ZK", glyph: "⊡", kind: "long", group: "crypto", accent: "green", resultInSpcCalls: false, description: "Zero-knowledge proof generation in a TEE; proof delivered via callback." }),
  P({ address: "0x000000000000000000000000000000000000081b", key: "dkms", label: "DKMS Key", badge: "DKMS", glyph: "⚷", kind: "short", group: "crypto", accent: "green", resultInSpcCalls: true, description: "Deterministic secp256k1 key derivation inside a TEE enclave." }),
  P({ address: "0x0000000000000000000000000000000000000009", key: "ed25519", label: "Ed25519 Verify", badge: "ED25519", glyph: "⚿", kind: "sync", group: "crypto", accent: "green", resultInSpcCalls: false, description: "Native Ed25519 signature verification." }),
  P({ address: "0x0000000000000000000000000000000000000100", key: "p256", label: "P-256 Verify", badge: "P256", glyph: "⚿", kind: "sync", group: "crypto", accent: "green", resultInSpcCalls: false, description: "Native SECP256R1 / WebAuthn signature verification." }),
];

const BY_ADDR = new Map(PRECOMPILES.map((p) => [p.address, p]));

export function getPrecompile(address: string): PrecompileMeta | undefined {
  return BY_ADDR.get(normAddr(address));
}

export function getPrecompileOrUnknown(address: string): PrecompileMeta {
  return (
    getPrecompile(address) ?? {
      address: normAddr(address),
      key: "unknown",
      label: "Unknown Precompile",
      badge: normAddr(address).slice(-4).toUpperCase(),
      glyph: "?",
      kind: "long",
      group: "ai",
      accent: "gold",
      resultInSpcCalls: false,
      description: "Unrecognized precompile address.",
    }
  );
}

export const ACCENT_HEX: Record<Accent, string> = {
  pink: "#FF1DCE",
  lime: "#BFFF00",
  green: "#19D184",
  gold: "#FACC15",
  red: "#EF4444",
};
