/* Verify the decoder against the LIVE Ritual chain.
 * Usage:
 *   npm run decode            # auto: pull fresh LLM + HTTP + Agent calls and decode in full
 *   npm run decode -- <tx>... # decode specific transactions
 *   npm run decode -- --feed  # print a compact live feed
 *
 * The testnet node is non-archival and prunes old transactions, so we always
 * discover fresh samples from recent JobAdded logs rather than hardcoding hashes.
 */
import { JOB_ADDED_TOPIC0, SYSTEM, getPrecompileOrUnknown, normAddr } from "../lib/ritual/constants";
import { getBlockNumber, getLogs } from "../lib/ritual/client";
import { getRecordsByTx, getFeed } from "../lib/ritual/indexer";
import type { InferenceRecord } from "../lib/ritual/types";

const line = (c = "─", n = 74) => c.repeat(n);

async function latestTxByPrecompile(keys: string[], blocks = 4000): Promise<Map<string, string>> {
  const latest = await getBlockNumber();
  const logs = await getLogs(
    { address: SYSTEM.ASYNC_JOB_TRACKER, topics: [JOB_ADDED_TOPIC0], fromBlock: latest - blocks, toBlock: latest },
    undefined,
  );
  const found = new Map<string, string>();
  for (const l of [...logs].reverse()) {
    const key = getPrecompileOrUnknown(normAddr(l.topics[3] ?? "")).key;
    if (keys.includes(key) && !found.has(key)) found.set(key, l.transactionHash);
  }
  return found;
}

function printRecord(r: InferenceRecord) {
  console.log(line());
  console.log(`Precompile : ${r.glyph} ${r.precompileLabel} (${r.precompileAddress})  [${r.kind}]`);
  console.log(`Sender     : ${r.sender}`);
  console.log(`Consumer   : ${r.consumer}`);
  console.log(`Block      : ${r.blockNumber}   originalTx: ${r.originalTx}`);
  console.log(`Proof      : ${r.proof ? r.proof.slice(0, 30) + "…  ✓ TEE-attested" : "—"}`);
  console.log(`Title      : ${r.decoded.title}`);
  console.log("  REQUEST:");
  for (const kv of r.decoded.request) {
    const v = kv.value.length > 200 ? kv.value.slice(0, 200) + "…" : kv.value;
    console.log(`    ${kv.label}: ${v.replace(/\n/g, "\n      ")}`);
  }
  console.log("  RESPONSE:");
  if (r.decoded.outputViaCallback) console.log("    (Phase-2 callback — long-running; input indexed, output delivered later)");
  else if (!r.decoded.response) console.log("    (none)");
  else
    for (const kv of r.decoded.response) {
      const v = kv.value.length > 200 ? kv.value.slice(0, 200) + "…" : kv.value;
      console.log(`    ${kv.label}: ${v.replace(/\n/g, "\n      ")}`);
    }
  if (r.decoded.encryptedOutput) console.log("    🔒 output is ECIES-encrypted (verifiable but private)");
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--feed") {
    const feed = await getFeed({ limit: 15 });
    console.log(`Live feed — blocks ${feed.fromBlock} → ${feed.toBlock}`);
    console.log("Counts:", feed.counts);
    console.log(line());
    for (const r of feed.records) {
      console.log(`${r.glyph} [${r.badge}] ${r.decoded.title}`);
      if (r.decoded.answerPreview) console.log(`     → ${r.decoded.answerPreview}`);
    }
    return;
  }

  let hashes = args;
  if (hashes.length === 0) {
    console.log("Discovering fresh inference calls from recent JobAdded logs…");
    const map = await latestTxByPrecompile(["llm", "http", "sovereign-agent", "image"]);
    hashes = [...map.values()];
    console.log("Found:", [...map.entries()].map(([k, v]) => `${k}=${v.slice(0, 12)}…`).join("  "), "\n");
  }

  for (const hash of hashes) {
    console.log(line("═"));
    console.log("TX:", hash);
    const records = await getRecordsByTx(hash);
    if (records.length === 0) console.log("  (no precompile calls found — may be pruned)");
    for (const r of records) printRecord(r);
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
