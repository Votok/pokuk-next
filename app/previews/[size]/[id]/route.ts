import sharp from "sharp";
import { originalName } from "../../../../lib/catalog";
import { readOriginal, readPreview, writePreview } from "../../../../lib/storage";

export async function GET(_: Request, { params }: RouteContext<"/previews/[size]/[id]">) {
  const { size, id } = await params;
  if (!["small", "screen"].includes(size) || !/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 404 });
  const key = `v1-${size}-${id}.jpg`;
  try {
    let bytes = await readPreview(key);
    if (!bytes) {
      const name = await originalName(id);
      if (!name) return new Response(null, { status: 404 });
      const edge = size === "small" ? 640 : 2560;
      bytes = await sharp(await readOriginal(name)).autoOrient()
        .resize(edge, edge, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer();
      await writePreview(key, bytes);
    }
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable"
    } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
