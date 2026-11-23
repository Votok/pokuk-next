import { fixture, readOriginal } from "../../../lib/storage";
export async function GET(_: Request, { params }: RouteContext<"/originals/[name]">) {
  if (!fixture) return new Response(null, { status: 404 });
  try {
    const bytes = await readOriginal((await params).name);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg" } });
  } catch { return new Response(null, { status: 404 }); }
}
