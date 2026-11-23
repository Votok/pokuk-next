import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobServiceClient, RestError } from "@azure/storage-blob";

export const fixture = process.env.GALLERY_FIXTURE_DIR;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error("Gallery storage is unavailable");
  return value;
}

function container(name: string) {
  return BlobServiceClient.fromConnectionString(
    required("AZURE_STORAGE_CONNECTION_STRING"),
  ).getContainerClient(required(name));
}

export async function readRevision(previous?: string) {
  if (fixture) {
    const bytes = await readFile(path.join(fixture, "catalog.json"));
    const revision = createHash("sha256").update(bytes).digest("hex");
    return previous === revision ? null : { revision, json: bytes.toString() };
  }
  const blob = container("GALLERY_CONTAINER").getBlobClient(required("GALLERY_CATALOG_BLOB"));
  try {
    const response = await blob.download(0, undefined, { conditions: { ifNoneMatch: previous } });
    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody!) chunks.push(Buffer.from(chunk));
    return {
      revision: response.etag!,
      json: Buffer.concat(chunks)
        .toString("utf8")
        .replace(/^\uFEFF/, ""),
    };
  } catch (error) {
    if (error instanceof RestError && error.statusCode === 304) return null;
    throw error;
  }
}

export function readOriginal(name: string) {
  if (!fixture) return container("GALLERY_CONTAINER").getBlobClient(name).downloadToBuffer();
  if (name !== path.basename(name) || name === "." || name === "..")
    throw new Error("Invalid original");
  return readFile(path.join(fixture, "originals", name));
}

export async function readPreview(key: string) {
  try {
    return fixture
      ? await readFile(path.join(fixture, "previews", key))
      : await container("GALLERY_PREVIEW_CONTAINER").getBlobClient(key).downloadToBuffer();
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" ||
      (error instanceof RestError && error.code === "BlobNotFound")
    )
      return null;
    throw error;
  }
}

export async function writePreview(key: string, bytes: Buffer) {
  if (fixture) {
    const folder = path.join(fixture, "previews");
    await mkdir(folder, { recursive: true });
    const temporary = path.join(folder, randomUUID());
    await writeFile(temporary, bytes);
    await rename(temporary, path.join(folder, key));
  } else {
    const blob = container("GALLERY_PREVIEW_CONTAINER").getBlockBlobClient(key);
    try {
      await blob.uploadData(bytes, {
        conditions: { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: "image/jpeg" },
      });
    } catch (error) {
      if (
        !(
          error instanceof RestError &&
          ["BlobAlreadyExists", "ConditionNotMet"].includes(error.code ?? "")
        )
      )
        throw error;
    }
  }
}
