import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

// Resolve through Node's module lookup rather than <cwd>/node_modules: with
// npm workspaces these packages are usually hoisted to the repo root's
// node_modules, not web/node_modules.
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const nextBin = path.join(
  path.dirname(require.resolve("next/package.json")),
  "dist",
  "bin",
  "next"
);

const wasmDir = path.dirname(require.resolve("@next/swc-wasm-nodejs/package.json"));

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TEST_WASM_DIR: wasmDir
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
