import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolves to the project root (three levels up from src/mcp/utils/).
 * Works in both source (ts) and compiled (dist) layouts.
 */
function getProjectRoot(): string {
  return resolve(__dirname, "..", "..", "..");
}

/**
 * Run a backgen CLI command and return stdout.
 * Uses spawnSync to avoid shell injection — args are passed directly to the node process.
 * @param args - CLI arguments to pass to backgen
 * @param cwd - Working directory for the command (defaults to current process cwd)
 * @returns stdout from the command
 * @throws {Error} If the process exits with a non-zero status
 */
export function runBackgen(args: string[], cwd?: string): string {
  const projectRoot = getProjectRoot();
  const backgenPath = resolve(projectRoot, "dist", "index.js");

  const result = spawnSync(process.execPath, [backgenPath, ...args], {
    cwd: cwd || process.cwd(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "inherit"],
    timeout: 120_000, // 2 min timeout for installs
    maxBuffer: 10 * 1024 * 1024, // 10 MB
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `Process exited with code ${result.status}`);
  }

  return result.stdout ?? "";
}
