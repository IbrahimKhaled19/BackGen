import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { healthCommand } from "../health.js";

describe("healthCommand", () => {
  let consoleOutput: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = (...args: string[]) => {
      consoleOutput.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("should execute without throwing", () => {
    expect(() => healthCommand()).not.toThrow();
  });

  it("should display Node.js version", () => {
    healthCommand();
    const output = consoleOutput.join("\n");
    expect(output).toContain("Node.js");
    expect(output).toContain(process.version);
  });

  it("should display Platform info", () => {
    healthCommand();
    const output = consoleOutput.join("\n");
    expect(output).toContain("Platform");
    expect(output).toContain(process.platform);
  });

  it("should display BackGen version", () => {
    healthCommand();
    const output = consoleOutput.join("\n");
    expect(output).toContain("BackGen");
    expect(output).toContain("version:");
  });

  it("should display system health header", () => {
    healthCommand();
    const output = consoleOutput.join("\n");
    expect(output).toContain("System Health");
  });
});
