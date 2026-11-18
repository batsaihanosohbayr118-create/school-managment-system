import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

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
