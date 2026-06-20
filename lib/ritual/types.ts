import type { Accent, ExecKind, Group } from "./constants";

/** A single decoded field, rendered as a labelled row. */
export interface KV {
  label: string;
  value: string;
  kind?: "text" | "json" | "hex" | "address" | "url" | "number" | "bool";
  mono?: boolean;
}

/** Result of decoding one precompile call's input + output. */
export interface DecodedCall {
  /** human title for the feed card, e.g. 'POST api.example.com/price' or the prompt */
  title: string;
  /** optional secondary line (model, status, etc.) */
  subtitle?: string;
  model?: string;
  /** short preview of the request intent (prompt / url) */
  promptPreview?: string;
  /** short preview of the response (answer / status) */
  answerPreview?: string;
  request: KV[];
  response: KV[] | null;
  /** output is ECIES-encrypted to a user key (cannot show cleartext) */
  encryptedOutput?: boolean;
  /** output not present because it is delivered later via a Phase-2 callback */
  outputViaCallback?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

/** A fully-resolved inference record for the feed / detail view. */
export interface InferenceRecord {
  // identity
  precompileAddress: string;
  precompileKey: string;
  precompileLabel: string;
  badge: string;
  glyph: string;
  kind: ExecKind;
  group: Group;
  accent: Accent;

  // chain context
  jobId: string | null;
  sender: string | null; // user EOA that initiated the call
  consumer: string | null; // contract the call went through (tx.to)
  originalTx: string | null;
  systemTx: string | null; // commitment/settlement (type 0x11) tx that emitted JobAdded
  commitmentTx: string | null;
  settlementTx: string | null;
  blockNumber: number | null;
  timestamp: number | null; // unix seconds

  // raw payloads (for the "Decode" / raw view)
  inputHex: string | null;
  outputHex: string | null;
  proof: string | null;

  // decoded
  decoded: DecodedCall;
}

export interface FeedResponse {
  records: InferenceRecord[];
  fromBlock: number;
  toBlock: number;
  scannedAt: number;
  counts: Record<string, number>; // precompileKey -> count
}

/** Standard transaction-level data (like a general explorer shows). */
export interface TxOverview {
  hash: string;
  status: "success" | "failed";
  typeHex: string;
  typeLabel: string;
  blockNumber: number | null;
  timestamp: number | null;
  from: string | null;
  to: string | null;
  valueRitual: string;
  nonce: number | null;
  gasUsed: string;
  gasPriceGwei: string;
  feeRitual: string;
  logsCount: number;
  originalTx: string | null;
  commitmentTx: string | null;
  settlementTx: string | null;
}

export interface TxDetail {
  overview: TxOverview;
  records: InferenceRecord[];
}
