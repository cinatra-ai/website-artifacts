// Test-runner wrapper: run Vitest once, ignoring any pass-through CLI flags.
//
// The baseline extension CI invokes `pnpm test --if-present`, and pnpm forwards
// `--if-present` on to the script command. Vitest's CLI parser rejects unknown
// flags, so invoke Vitest's CLI entry directly and drop the extra argv — the
// wrapper always runs the suite exactly once and exits with Vitest's status.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitestCli = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const result = spawnSync(process.execPath, [vitestCli, "run"], { stdio: "inherit" });
process.exit(result.status ?? 1);
