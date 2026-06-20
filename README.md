# Ritual Inference Explorer

**Etherscan for verifiable AI.** A chain-wide, read-only block explorer specialized for AI
inference on [Ritual Chain](https://docs.ritualfoundation.org) (id `1979`). It indexes every
asynchronous precompile call on the chain — LLM, HTTP, image / audio / video generation, sovereign
& persistent agents, ZK, FHE, DKMS — decodes the on-chain `spcCalls` into human-readable
**input → output**, and shows the executor and **TEE attestation proof** in a live, searchable feed.

> Agent-specific feeds exist. A **chain-wide, decoded inference explorer does not** — this is the
> piece of infrastructure that's missing for a chain whose whole thesis is *verifiable AI*.

## Why this design

- **Read-only.** It only reads logs, receipts and `spcCalls` that already exist on-chain. No
  contracts to deploy, **no wallet, no funding, no executor/DKMS dependency** — none of the failure
  modes of building *interactive* dApps. The only real risk was whether Ritual's custom `spcCalls`
  format is decodable, and that was de-risked up front (see "Verification").
- **On-brand.** Ritual = verifiable AI. This is the natural explorer for it.

## How it works

```
AsyncJobTracker.JobAdded logs        ← discover every async inference call, chain-wide
        │  (topics: sender, jobId, precompileAddress)
        ▼
system tx (type 0x11)  ──.originalTx──▶  user tx (type 0x2)
        │ precompileInput                      │ receipt.spcCalls[] = { address, input, output, proof }
        ▼                                       ▼
                 per-precompile ABI decode (viem)
                 → { request[], response[], model, proof, encrypted? }
```

- **Short-running** precompiles (HTTP `0x0801`, LLM `0x0802`, DKMS `0x081B`) carry their result in
  `receipt.spcCalls` → full input **and** output are decoded.
- **Long-running** precompiles (image `0x0818`, audio `0x0819`, video `0x081A`, agents `0x080C` /
  `0x0820`, ZK `0x0806`, FHE `0x0807`, long-HTTP `0x0805`) deliver output later via an
  AsyncDelivery callback → the decoded **input** + proof are shown, output marked "phase-2 callback".
- **Encrypted outputs** (ECIES, when `userPublicKey` + `piiEnabled`) are detected and shown as
  "🔒 encrypted, TEE-attested" rather than failing.

## Interface — "Neural Terminal"

A split-panel, terminal-style live console (inspired by the neural-graph explorer aesthetic):

- **HUD bar:** brand, live chain id / block height / call counts, LIVE indicator, a scrolling ticker of recent prompts/models, and a tx-hash lookup.
- **Neural canvas (full-bleed backdrop):** an animated 6-node **TEE pipeline** — `SUBMIT → COMMIT → TEE·EXEC → ATTEST → SETTLE → DELIVER` — wired with glowing quadratic axons + radar rings (deterministic geometry). **Every live inference call becomes a particle** that flows through the pipeline, colored by precompile group (pink=AI, lime=I/O, green=crypto/verified).
- **Terminal feed panel (glass, left):** the live inference log as neon monospace rows — `block · ◇LLM model › "prompt" → "answer" ✓PROOF` — searchable, filterable by precompile, click a row → full decode.
- **Detail (`/tx/[hash]`):** decoded Input / Output / TEE proof / raw payloads.

Visual language: pure-black canvas, JetBrains Mono, CRT scanlines + blueprint grid, neon cyan network lines with Ritual's green/pink/lime semantic accents.

## Project layout

```
lib/
  neural.ts      deterministic pipeline geometry (stages, PRNG, bezier path)
  ritual/
    constants.ts chain config, precompile catalog (label/glyph/semantic color), address helpers
    client.ts    raw JSON-RPC (preserves Ritual's non-standard receipt fields viem strips)
    abi.ts       viem ABI parameter sets for every precompile (+ nested LLM completion)
    decode.ts    the core decoder: input/output hex → human-readable record (+ string-extraction fallback)
    indexer.ts   JobAdded scan → resolve originalTx → spcCalls → decode; getFeed() / getRecordsByTx()
    types.ts     shared types
app/
  page.tsx               Neural Terminal: HUD + neural canvas + live terminal feed
  tx/[hash]/page.tsx     full decoded detail view (input / output / proof / raw)
  api/feed/route.ts      GET /api/feed?limit=&blocks=&precompile=&q=
  api/tx/[hash]/route.ts GET /api/tx/0x...
components/
  NeuralCanvas.tsx  animated TEE-pipeline graph + live-data particles
  TerminalFeed.tsx  neon monospace inference log
  Hud.tsx           top status bar + ticker
  Controls.tsx      search + precompile filter chips
  RecordDetail.tsx  decoded detail sections
  ui.tsx            badges, proof chips, copy button
scripts/decode-tx.ts      CLI: decode live transactions (verification harness)
```

## Run

```bash
npm install
npm run dev          # http://localhost:3000

# or production
npm run build
npm run start
```

Config via `.env.local` (defaults to the public endpoints):

```
NEXT_PUBLIC_RITUAL_RPC_URL=https://rpc.ritualfoundation.org
NEXT_PUBLIC_RITUAL_EXPLORER_URL=https://explorer.ritualfoundation.org
```

## Verification

The core decoder is verified against the **live chain** (no mocks):

```bash
npm run decode          # auto-discovers fresh LLM/HTTP/agent/image calls and decodes them
npm run decode -- --feed
npm run decode -- 0x<txhash>
```

Confirmed end-to-end decodes from live traffic:

| Precompile | Decoded |
|---|---|
| LLM `0x0802` | prompt *"list 3 colors, dont think"* → **"Red, Blue, Green"**, model `zai-org/GLM-4.7-FP8`, tokens 12/98/110, TEE proof |
| HTTP `0x0801` | `GET …/x402-mock` → `200`, body *"Payment verified, here is your resource!"* (x402) |
| Image `0x0818` | prompt *"A cat sitting on a cloud"*, model `black-forest-labs/FLUX.2-klein-4B` |
| Video `0x081A` | prompt *"A futuristic city at sunset"* |
| Sovereign Agent `0x080C` | live agent *"Amber Orange"* running `zeroclaw` |

> Note: the public RPC node is **non-archival** and prunes old transactions, so the explorer (and
> the verification script) always work from **recent** blocks. `eth_getLogs` is range-limited
> (~3k blocks per call), so the indexer scans a bounded recent window.

## Notes / limitations

- The feed scans a recent window (default 3000 blocks ≈ a few minutes at ~350 ms/block). For a
  production deployment, add a persistent indexer (DB) to retain history beyond the node's pruning
  horizon and to avoid re-scanning per request.
- Synchronous precompiles (ONNX, JQ, Ed25519, P-256) emit no `JobAdded` event and aren't in the
  feed; they can still be inspected via the tx lookup if present in a receipt's `spcCalls`.
