import { decodeAbiParameters, type Hex } from "viem";
import * as A from "./abi";
import { getPrecompileOrUnknown } from "./constants";
import type { DecodedCall, KV } from "./types";

/* ----------------------------- helpers ----------------------------- */

function isHex(s: string | null | undefined): s is Hex {
  return !!s && /^0x[0-9a-fA-F]*$/.test(s) && s.length > 2;
}

/** Decode a hex byte string to UTF-8, keeping only printable content. */
export function hexToText(hex: string): string {
  if (!isHex(hex)) return "";
  const bytes = hex.slice(2).match(/.{1,2}/g) ?? [];
  let out = "";
  for (const b of bytes) out += String.fromCharCode(parseInt(b, 16));
  try {
    // re-interpret as UTF-8 where possible
    out = decodeURIComponent(escape(out));
  } catch {
    /* keep latin1 */
  }
  return out;
}

/** ECIES ciphertext: uncompressed ephemeral pubkey prefix 0x04 + IV + tag + ct. */
export function looksEncrypted(hex: string): boolean {
  return isHex(hex) && hex.slice(2, 4).toLowerCase() === "04" && hex.length >= 2 + 130;
}

/** Extract printable ASCII runs (len >= min) from a hex blob — resilience fallback. */
export function extractStrings(hex: string, min = 4): string[] {
  if (!isHex(hex)) return [];
  const bytes = hex.slice(2).match(/.{1,2}/g) ?? [];
  const runs: string[] = [];
  let cur = "";
  for (const b of bytes) {
    const c = parseInt(b, 16);
    if (c >= 0x20 && c <= 0x7e) cur += String.fromCharCode(c);
    else {
      if (cur.length >= min) runs.push(cur);
      cur = "";
    }
  }
  if (cur.length >= min) runs.push(cur);
  return runs;
}

export function shortHex(hex: string, n = 10): string {
  if (!hex || hex.length <= n + 6) return hex;
  return `${hex.slice(0, n)}…${hex.slice(-4)}`;
}

function clip(s: string, n = 160): string {
  s = s.replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function dec(params: readonly any[], hex: string): any[] | null {
  if (!isHex(hex)) return null;
  try {
    return decodeAbiParameters(params as any, hex) as unknown as any[];
  } catch {
    return null;
  }
}

/**
 * Short-running outputs are either the struct directly, or an `abi.encode(bytes)`
 * envelope wrapping an ECIES ciphertext (when userPublicKey was set). Unwrap one
 * layer and detect encryption.
 */
function unwrapStructOutput(
  output: string,
  params: readonly any[],
): { fields: any[] | null; encrypted: boolean; rawInner?: string } {
  const direct = dec(params, output);
  if (direct) return { fields: direct, encrypted: false };
  const env = dec([{ type: "bytes" }], output);
  if (env) {
    const inner = env[0] as string;
    if (looksEncrypted(inner)) return { fields: null, encrypted: true };
    const nested = dec(params, inner);
    if (nested) return { fields: nested, encrypted: false };
    return { fields: null, encrypted: false, rawInner: inner };
  }
  return { fields: null, encrypted: false };
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function headersKV(keys: string[], vals: string[]): string {
  return keys.map((k, i) => `${k}: ${vals[i] ?? ""}`).join("\n");
}

function lastUserPrompt(messagesJson: string): { prompt: string; pretty: string } {
  try {
    const msgs = JSON.parse(messagesJson) as { role: string; content: string }[];
    const u = [...msgs].reverse().find((m) => m.role === "user");
    return {
      prompt: u?.content ?? msgs.map((m) => m.content).join(" "),
      pretty: msgs.map((m) => `${m.role}: ${m.content}`).join("\n"),
    };
  } catch {
    return { prompt: messagesJson, pretty: messagesJson };
  }
}

/* ----------------------- LLM nested completion ----------------------- */

interface LlmCompletion {
  model?: string;
  content?: string;
  finishReason?: string;
  promptTokens?: string;
  completionTokens?: string;
  totalTokens?: string;
}

function decodeCompletion(completionData: string): LlmCompletion | null {
  const c = dec(A.COMPLETION_DATA, completionData);
  if (!c) return null;
  const out: LlmCompletion = { model: c[3] as string };
  const usage = dec(A.USAGE_DATA, c[8] as string);
  if (usage) {
    out.promptTokens = String(usage[0]);
    out.completionTokens = String(usage[1]);
    out.totalTokens = String(usage[2]);
  }
  const choices = c[7] as string[];
  if (Array.isArray(choices) && choices.length > 0) {
    const choice = dec(A.CHOICE_DATA, choices[0]);
    if (choice) {
      out.finishReason = choice[1] as string;
      const msg = dec(A.MESSAGE_DATA, choice[2] as string);
      if (msg) out.content = msg[1] as string;
    }
  }
  return out;
}

/* ----------------------------- decoders ----------------------------- */

function decodeHttp(input: string | null, output: string | null): DecodedCall {
  const req: KV[] = [];
  let title = "HTTP Call";
  let promptPreview = "";
  const d = input ? dec(A.HTTP_INPUT, input) : null;
  if (d) {
    const url = d[5] as string;
    const method = A.HTTP_METHODS[Number(d[6])] ?? String(d[6]);
    const headerKeys = strArr(d[7]);
    const headerVals = strArr(d[8]);
    const body = hexToText(d[9] as string);
    const pii = Number(d[12]) !== 0;
    title = `${method} ${url}`;
    promptPreview = body ? `${url}  ${clip(body, 80)}` : url;
    req.push({ label: "Method", value: method });
    req.push({ label: "URL", value: url, kind: "url", mono: true });
    if (headerKeys.length) req.push({ label: "Headers", value: headersKV(headerKeys, headerVals), kind: "text", mono: true });
    if (body) req.push({ label: "Body", value: body, kind: "json", mono: true });
    req.push({ label: "Executor", value: d[0] as string, kind: "address", mono: true });
    req.push({ label: "TTL (blocks)", value: String(d[2]) });
    req.push({ label: "PII / secrets", value: pii ? "enabled" : "disabled" });
    if (isHex(d[4] as string) && (d[4] as string).length > 2)
      req.push({ label: "Output encryption", value: "ECIES (user public key set)" });
  } else if (input) {
    for (const s of extractStrings(input).slice(0, 8)) req.push({ label: "Detected", value: s, mono: true });
  }

  // output
  let response: KV[] | null = null;
  let answerPreview = "";
  let encryptedOutput = false;
  let hasError = false;
  let errorMessage: string | undefined;
  if (output && isHex(output)) {
    const u = unwrapStructOutput(output, A.HTTP_OUTPUT);
    if (u.fields) {
      const o = u.fields;
      const status = Number(o[0]);
      const rHeaderKeys = strArr(o[1]);
      const rHeaderVals = strArr(o[2]);
      const rBody = hexToText(o[3] as string);
      const err = o[4] as string;
      response = [{ label: "Status", value: String(status), kind: "number" }];
      if (rHeaderKeys.length) response.push({ label: "Headers", value: headersKV(rHeaderKeys, rHeaderVals), mono: true });
      if (rBody) response.push({ label: "Body", value: rBody, kind: "json", mono: true });
      if (err) response.push({ label: "Error", value: err });
      answerPreview = err ? `error: ${err}` : `${status} · ${clip(rBody, 80)}`;
      hasError = !!err || status >= 400;
      errorMessage = err || undefined;
    } else if (u.encrypted) {
      encryptedOutput = true;
      response = [
        { label: "Encrypted response", value: "ECIES envelope — decryptable only by the user's private key." },
        { label: "Ciphertext", value: shortHex(output, 24), mono: true },
      ];
      answerPreview = "🔒 encrypted (TEE-attested)";
    } else {
      response = [{ label: "Raw output", value: shortHex(output, 24), mono: true }];
    }
  }

  return { title, subtitle: "HTTP precompile", promptPreview, answerPreview, request: req, response, encryptedOutput, hasError, errorMessage };
}

function decodeLlm(input: string | null, output: string | null): DecodedCall {
  const req: KV[] = [];
  let title = "LLM Inference";
  let model: string | undefined;
  let promptPreview = "";
  const d = input ? dec(A.LLM_INPUT, input) : null;
  if (d) {
    model = d[6] as string;
    const { prompt, pretty } = lastUserPrompt(d[5] as string);
    title = clip(prompt, 100) || "LLM Inference";
    promptPreview = clip(prompt, 140);
    req.push({ label: "Messages", value: pretty, kind: "text" });
    req.push({ label: "Model", value: model, mono: true });
    const temp = Number(d[22]) / 1000;
    if (!Number.isNaN(temp)) req.push({ label: "Temperature", value: String(temp) });
    const maxTok = Number(d[10]);
    req.push({ label: "Max tokens", value: maxTok < 0 ? "default" : String(maxTok) });
    req.push({ label: "Executor", value: d[0] as string, kind: "address", mono: true });
  } else if (input) {
    for (const s of extractStrings(input).slice(0, 8)) req.push({ label: "Detected", value: s, mono: true });
  }

  let response: KV[] | null = null;
  let answerPreview = "";
  let encryptedOutput = false;
  let hasError = false;
  let errorMessage: string | undefined;
  if (output && isHex(output)) {
    const o = dec(A.LLM_OUTPUT, output);
    if (o) {
      hasError = Number(o[0]) !== 0;
      errorMessage = (o[3] as string) || undefined;
      const completionData = o[1] as string;
      if (hasError) {
        response = [{ label: "Error", value: errorMessage ?? "inference failed" }];
        answerPreview = `error: ${clip(errorMessage ?? "", 80)}`;
      } else if (looksEncrypted(completionData)) {
        encryptedOutput = true;
        response = [{ label: "Encrypted completion", value: "ECIES envelope — decryptable only by the user's private key." }];
        answerPreview = "🔒 encrypted (TEE-attested)";
      } else {
        const comp = decodeCompletion(completionData);
        if (comp) {
          if (comp.model) model = comp.model;
          response = [];
          if (comp.content) response.push({ label: "Completion", value: comp.content, kind: "text" });
          if (comp.finishReason) response.push({ label: "Finish reason", value: comp.finishReason });
          if (comp.totalTokens)
            response.push({ label: "Tokens", value: `prompt ${comp.promptTokens} · completion ${comp.completionTokens} · total ${comp.totalTokens}` });
          answerPreview = clip(comp.content ?? "", 140);
        } else {
          const txt = extractStrings(completionData, 3).join(" ");
          response = [{ label: "Completion (extracted)", value: clip(txt, 400) }];
          answerPreview = clip(txt, 140);
        }
      }
      const convo = o[4] as string[];
      if (Array.isArray(convo) && convo[1]) response?.push({ label: "Conversation DA", value: convo.join(" / "), mono: true });
    }
  }

  return { title, subtitle: model ? `LLM · ${model}` : "LLM Inference", model, promptPreview, answerPreview, request: req, response, encryptedOutput, hasError, errorMessage };
}

function decodeSovereignAgent(input: string | null): DecodedCall {
  const req: KV[] = [];
  let title = "Sovereign Agent";
  let model: string | undefined;
  let promptPreview = "";
  const d = input ? dec(A.SOVEREIGN_AGENT_INPUT, input) : null;
  if (d) {
    const cli = A.CLI_TYPES[Number(d[11])] ?? `cli#${d[11]}`;
    const prompt = d[12] as string;
    model = d[18] as string;
    const sysPrompt = (d[17] as string[])?.[0] ?? "";
    title = clip(prompt, 100) || "Sovereign Agent run";
    promptPreview = clip(prompt, 140);
    req.push({ label: "Prompt", value: prompt, kind: "text" });
    req.push({ label: "CLI harness", value: cli });
    if (model) req.push({ label: "Model", value: model, mono: true });
    const tools = strArr(d[19]);
    if (tools.length) req.push({ label: "Tools", value: tools.join(", ") });
    req.push({ label: "Max turns", value: String(d[20]) });
    req.push({ label: "Executor", value: d[0] as string, kind: "address", mono: true });
    if (sysPrompt) req.push({ label: "System prompt ref", value: sysPrompt, mono: true });
  } else if (input) {
    const strings = extractStrings(input, 6);
    if (strings.length) {
      promptPreview = clip(strings.sort((a, b) => b.length - a.length)[0], 140);
      title = promptPreview || title;
      for (const s of strings.slice(0, 10)) req.push({ label: "Detected", value: s, mono: true });
    }
  }
  return { title, subtitle: model ? `Sovereign Agent · ${model}` : "Sovereign Agent", model, promptPreview, request: req, response: null, outputViaCallback: true };
}

function decodePersistentAgent(input: string | null): DecodedCall {
  const req: KV[] = [];
  let model: string | undefined;
  const d = input ? dec(A.PERSISTENT_AGENT_INPUT, input) : null;
  if (d) {
    const provider = A.AGENT_PROVIDERS[Number(d[12])] ?? `provider#${d[12]}`;
    model = d[13] as string;
    const restore = d[23] as string;
    req.push({ label: "Provider", value: provider });
    if (model) req.push({ label: "Model", value: model, mono: true });
    req.push({ label: "Mode", value: restore ? `revive from CID ${clip(restore, 40)}` : "fresh spawn" });
    const soul = (d[16] as string[])?.join(" / ");
    if (soul) req.push({ label: "Soul ref", value: soul, mono: true });
    req.push({ label: "Executor", value: d[0] as string, kind: "address", mono: true });
  } else if (input) {
    for (const s of extractStrings(input, 6).slice(0, 8)) req.push({ label: "Detected", value: s, mono: true });
  }
  return { title: model ? `Persistent Agent · ${model}` : "Persistent Agent spawn", subtitle: "Persistent Agent", model, request: req, response: null, outputViaCallback: true };
}

function decodeModal(input: string | null, kind: "image" | "audio" | "video"): DecodedCall {
  const req: KV[] = [];
  let model: string | undefined;
  let title = `${kind[0].toUpperCase()}${kind.slice(1)} generation`;
  let promptPreview = "";
  const d = input ? dec(A.MODAL_INPUT_OUTPUT, input) : null;
  if (d) {
    model = d[14] as string;
    const inputs = d[15] as any[];
    let prompt = "";
    if (Array.isArray(inputs)) {
      for (const mi of inputs) {
        if (Number(mi[0]) === 0) prompt = hexToText(mi[1] as string); // TEXT
      }
    }
    if (prompt) {
      title = clip(prompt, 100);
      promptPreview = clip(prompt, 140);
      req.push({ label: "Prompt", value: prompt, kind: "text" });
    }
    if (model) req.push({ label: "Model", value: model, mono: true });
    req.push({ label: "Executor", value: d[0] as string, kind: "address", mono: true });
  } else if (input) {
    const strings = extractStrings(input, 5);
    promptPreview = clip(strings.sort((a, b) => b.length - a.length)[0] ?? "", 140);
    if (promptPreview) title = promptPreview;
    for (const s of strings.slice(0, 8)) req.push({ label: "Detected", value: s, mono: true });
  }
  return { title, subtitle: model ? `${kind} · ${model}` : title, model, promptPreview, request: req, response: null, outputViaCallback: true };
}

function decodeZk(input: string | null): DecodedCall {
  const req: KV[] = [];
  const d = input ? dec(A.ZK_INPUT, input) : null;
  if (d) {
    req.push({ label: "Input encrypted", value: Number(d[5]) !== 0 ? "yes" : "no" });
    req.push({ label: "Operation input", value: shortHex(d[13] as string, 24), mono: true });
    req.push({ label: "Executor", value: d[0] as string, kind: "address", mono: true });
  }
  return { title: "ZK proof request", subtitle: "ZK precompile", request: req, response: null, outputViaCallback: true };
}

function decodeFhe(input: string | null): DecodedCall {
  const req: KV[] = [];
  let model: string | undefined;
  const d = input ? dec(A.FHE_INPUT, input) : null;
  if (d) {
    model = d[5] as string;
    if (model) req.push({ label: "Model", value: model, mono: true });
    req.push({ label: "Layers", value: String(d[9]) });
    req.push({ label: "Encrypted input", value: shortHex(d[6] as string, 24), mono: true });
  }
  return { title: model ? `FHE inference · ${model}` : "FHE inference", subtitle: "FHE precompile", model, request: req, response: null, outputViaCallback: true };
}

function decodeLongHttp(input: string | null): DecodedCall {
  const req: KV[] = [];
  let title = "Long-running HTTP";
  let promptPreview = "";
  const d = input ? dec(A.LONG_HTTP_INPUT, input) : null;
  if (d) {
    const url = d[14] as string;
    const method = A.HTTP_METHODS[Number(d[15])] ?? String(d[15]);
    const body = hexToText(d[18] as string);
    title = `${method} ${url}`;
    promptPreview = url;
    req.push({ label: "Method", value: method });
    req.push({ label: "URL", value: url, kind: "url", mono: true });
    if (body) req.push({ label: "Body", value: body, kind: "json", mono: true });
    req.push({ label: "Result JSON path", value: d[31] as string, mono: true });
    req.push({ label: "Executor", value: d[0] as string, kind: "address", mono: true });
  } else if (input) {
    for (const s of extractStrings(input).slice(0, 8)) req.push({ label: "Detected", value: s, mono: true });
  }
  return { title, subtitle: "Long-running HTTP", promptPreview, request: req, response: null, outputViaCallback: true };
}

function decodeDkms(input: string | null, output: string | null): DecodedCall {
  const req: KV[] = [];
  const d = input ? dec(A.DKMS_INPUT, input) : null;
  if (d) {
    req.push({ label: "Owner", value: d[5] as string, kind: "address", mono: true });
    req.push({ label: "Key index", value: String(d[6]) });
    req.push({ label: "Key format", value: Number(d[7]) === 1 ? "secp256k1" : String(d[7]) });
  }
  let response: KV[] | null = null;
  let answerPreview = "";
  if (output && isHex(output)) {
    const o = dec(A.DKMS_OUTPUT, output);
    if (o) {
      response = [
        { label: "Derived address", value: o[0] as string, kind: "address", mono: true },
        { label: "Public key", value: shortHex(o[1] as string, 24), mono: true },
      ];
      answerPreview = `derived ${shortHex(o[0] as string)}`;
    } else if (looksEncrypted(output)) {
      response = [{ label: "Encrypted output", value: "ECIES envelope" }];
      answerPreview = "🔒 encrypted";
    }
  }
  return { title: "DKMS key derivation", subtitle: "DKMS precompile", request: req, response, answerPreview };
}

function decodeGeneric(input: string | null, output: string | null, label: string): DecodedCall {
  const req: KV[] = [];
  if (input) for (const s of extractStrings(input).slice(0, 10)) req.push({ label: "Detected", value: s, mono: true });
  if (input && req.length === 0) req.push({ label: "Raw input", value: shortHex(input, 32), mono: true });
  let response: KV[] | null = null;
  if (output && isHex(output) && output.length > 2) {
    response = looksEncrypted(output)
      ? [{ label: "Encrypted output", value: "ECIES envelope" }]
      : [{ label: "Raw output", value: shortHex(output, 32), mono: true }];
  }
  return { title: label, subtitle: label, request: req, response };
}

/* ----------------------------- entry ----------------------------- */

export function decodeCall(precompileAddress: string, inputHex: string | null, outputHex: string | null): DecodedCall {
  const meta = getPrecompileOrUnknown(precompileAddress);
  switch (meta.key) {
    case "http":
      return decodeHttp(inputHex, outputHex);
    case "llm":
      return decodeLlm(inputHex, outputHex);
    case "sovereign-agent":
      return decodeSovereignAgent(inputHex);
    case "persistent-agent":
      return decodePersistentAgent(inputHex);
    case "image":
      return decodeModal(inputHex, "image");
    case "audio":
      return decodeModal(inputHex, "audio");
    case "video":
      return decodeModal(inputHex, "video");
    case "zk":
      return decodeZk(inputHex);
    case "fhe":
      return decodeFhe(inputHex);
    case "long-http":
      return decodeLongHttp(inputHex);
    case "dkms":
      return decodeDkms(inputHex, outputHex);
    default:
      return decodeGeneric(inputHex, outputHex, meta.label);
  }
}
