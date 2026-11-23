import sharp from "sharp";
import { createHash } from "node:crypto";
import { publishedBlob } from "../../../../lib/preview-url";
import { readOriginal, readPreview, writePreview } from "../../../../lib/storage";

export async function GET(_: Request, { params }: RouteContext<"/previews/[size]/[id]">) {
  const { size, id } = await params;
  const name = publishedBlob(id);
  if (!["small", "screen"].includes(size) || !name) return new Response(null, { status: 404 });
  const key = `v1-${size}-${createHash("sha256").update(name).digest("hex")}.jpg`;
  try {
    let bytes = await readPreview(key);
    if (!bytes) {
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
