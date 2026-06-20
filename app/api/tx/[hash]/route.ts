import { getRecordsByTx } from "@/lib/ritual/indexer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { hash: string } }) {
  const hash = params.hash;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    return Response.json({ error: "invalid transaction hash" }, { status: 400 });
  }
  try {
    const records = await getRecordsByTx(hash);
    return Response.json({ hash, records });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "lookup failed" }, { status: 502 });
  }
}
