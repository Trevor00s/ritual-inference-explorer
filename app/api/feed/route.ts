import { getFeed } from "@/lib/ritual/indexer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 30);
  const blocks = Number(url.searchParams.get("blocks") ?? 3000);
  const precompile = url.searchParams.get("precompile");
  const q = url.searchParams.get("q");

  try {
    const feed = await getFeed({
      limit: Number.isFinite(limit) ? limit : 30,
      blocks: Number.isFinite(blocks) ? blocks : 3000,
      precompileKey: precompile || null,
      search: q || null,
    });
    return Response.json(feed, {
      headers: { "Cache-Control": "s-maxage=2, stale-while-revalidate=10" },
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "feed failed" }, { status: 502 });
  }
}
