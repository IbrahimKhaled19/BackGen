import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdtempSync, existsSync } from "fs";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolves to the project root (three levels up from src/mcp/utils/).
 * Works in both source (ts) and compiled (dist) layouts.
 */
function getProjectRoot(): string {
  // In dist: dist/mcp/utils/ -> go up 3 levels to project root
  const candidate = resolve(__dirname, "..", "..", "..");
  // In src: src/mcp/utils/ -> go up 3 levels, look for dist/index.js
  if (existsSync(resolve(candidate, "dist", "index.js"))) {
    return candidate;
  }
  return candidate;
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

/**
 * Run backgen in a temporary directory and return { stdout, projectPath }.
 * Used for init_project which creates a new directory.
 * The temp directory and its contents are not cleaned up automatically.
 * @param args - CLI arguments (must include "init" and project name)
 * @returns Object containing stdout string and resolved projectPath
 */
export function runBackgenInTemp(args: string[]): {
  stdout: string;
  projectPath: string;
} {
  const tmpDir = mkdtempSync(resolve(tmpdir(), "backgen-"));
  const stdout = runBackgen(args, tmpDir);

  // Parse project name from args to determine output path
  const initIdx = args.indexOf("init");
  const nameIdx = initIdx >= 0 ? initIdx + 1 : -1;
  const projectName = nameIdx > 0 && nameIdx < args.length ? args[nameIdx] : "my-project";
  const projectPath = resolve(tmpDir, projectName);

  return { stdout, projectPath };
}
