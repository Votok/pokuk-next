import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { seed } from "../scripts/fixture.mjs";

export async function gallery(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "pokuk-test-"));
  await seed(dir);
  let app;
  async function stop() {
    if (app && app.exitCode === null && app.signalCode === null) {
      const exited = once(app, "exit");
      // A browser can still hold an HTTP connection during test teardown.
      app.kill("SIGKILL");
      await exited;
    }
  }
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  async function start() {
    await stop();
    app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "0"], {
      env: { ...process.env, GALLERY_FIXTURE_DIR: dir }, stdio: ["ignore", "pipe", "ignore"]
    });
    return new Promise((resolve, reject) => {
      let output = "";
      app.stdout.on("data", data => {
        output += data;
        const url = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (url && output.includes("Ready")) resolve(url[0]);
      });
      app.once("exit", () => reject(new Error("Local gallery could not start")));
      app.once("error", reject);
    });
  }
  return { dir, start };
}
