/* eslint-disable */
// LOCAL ONLY — this is NOT part of the deployed site (the app never imports it).
// Decrypts an ECIES output that was encrypted to YOUR public key, with YOUR private key.
//
// Usage (run on your machine only — the key never leaves it and is never committed):
//   RITUAL_PRIVATE_KEY=0x<yourPrivKey> npm run decrypt -- <txHash | 0xCiphertextHex>
//
// You can only decrypt outputs encrypted to a key YOU hold. Other people's
// encrypted outputs are not decryptable (that's the privacy guarantee).
import { ECIES_CONFIG, decrypt } from "eciesjs";
import { decodeAbiParameters } from "viem";
import { getReceipt } from "../lib/ritual/client";

// Ritual uses AES-256-GCM with a 12-byte nonce (per the Secrets docs); eciesjs
// defaults to 16, so align it or decryption fails.
ECIES_CONFIG.symmetricNonceLength = 12;

function looksEcies(hex?: string | null): hex is string {
  return !!hex && /^0x04[0-9a-fA-F]+$/.test(hex) && hex.length > 2 + 130;
}

async function ciphertextFromTx(hash: string): Promise<string> {
  let r = await getReceipt(hash);
  if (!r) throw new Error("transaction not found on the RPC (likely pruned — non-archival node)");
  if (!(r.spcCalls && r.spcCalls.length) && r.originalTx) r = await getReceipt(r.originalTx);
  const calls = r?.spcCalls ?? [];
  for (const c of calls) {
    // HTTP-style: output = abi.encode(bytes ciphertext)
    try {
      const [b] = decodeAbiParameters([{ type: "bytes" }], c.output as `0x${string}`) as [string];
      if (looksEcies(b)) return b;
    } catch {}
    // LLM-style: output envelope; completionData (field 1) is the ciphertext
    try {
      const d = decodeAbiParameters(
        [
          { type: "bool" },
          { type: "bytes" },
          { type: "bytes" },
          { type: "string" },
          { type: "tuple", components: [{ type: "string" }, { type: "string" }, { type: "string" }] },
        ],
        c.output as `0x${string}`,
      ) as unknown as any[];
      if (looksEcies(d[1])) return d[1];
    } catch {}
    if (looksEcies(c.output)) return c.output;
  }
  throw new Error("no ECIES-encrypted output found in this transaction");
}

async function main() {
  const keyRaw = process.env.RITUAL_PRIVATE_KEY;
  const arg = process.argv[2];
  if (!keyRaw || !arg) {
    console.error("Usage: RITUAL_PRIVATE_KEY=0x<privkey> npm run decrypt -- <txHash | 0xCiphertextHex>");
    console.error("Run locally only — your private key stays on your machine and is never committed or sent.");
    process.exit(1);
  }
  const sk = keyRaw.startsWith("0x") ? keyRaw.slice(2) : keyRaw;
  const ct = looksEcies(arg) ? arg : await ciphertextFromTx(arg);
  console.log(`ciphertext: ${ct.slice(0, 26)}… (${(ct.length - 2) / 2} bytes)`);
  const plain = decrypt(sk, Buffer.from(ct.slice(2), "hex"));
  console.log("\n=== decrypted plaintext ===\n" + Buffer.from(plain).toString("utf8") + "\n");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
