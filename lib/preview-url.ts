import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fixture } from "./storage";

// A second instance can verify the published blob name without reopening the catalog.
function signature(encoded: string) {
  const key = fixture ? "local-invented-gallery" : process.env.GALLERY_PREVIEW_SIGNING_KEY;
  if (!key) throw new Error("Preview signing key is unavailable");
  return createHmac("sha256", key)
    .update("pokuk-preview-v1:" + encoded)
    .digest("base64url");
}

export function previewUrls(name: string) {
  const encoded = Buffer.from(name).toString("base64url");
  const token = encoded + "." + signature(encoded);
  return { small: "/previews/small/" + token, screen: "/previews/screen/" + token };
}

export function publishedBlob(token: string) {
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match || !timingSafeEqual(Buffer.from(signature(match[1])), Buffer.from(match[2])))
    return null;
  return Buffer.from(match[1], "base64url").toString();
}
