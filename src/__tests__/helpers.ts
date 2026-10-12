import { execFileSync } from "child_process";
import { rmSync } from "fs";
import * as path from "path";

const CLI = path.resolve(__dirname, "../../dist/index.js");

/**
 * Run the built CLI once and return stdout.
 *
 * Uses execFileSync with an argument array, never a shell string, so args with
 * spaces or quotes behave the same on Windows and Linux.
 */
export function cli(args: string[], cwd: string): string {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 300_000,
  });
}

/**
 * Delete a directory, retrying in-process on Windows lock contention.
 * rmSync's own maxRetries handles the "file is still open" case without
 * spawning a shell or sleeping on a timer.
 */
export function safeRm(dir: string): void {
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}