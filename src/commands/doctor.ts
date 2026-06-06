import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";
import { readManifest } from "../core/manifest.js";

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  fix?: string;
}

export async function doctorCommand(): Promise<void> {
  console.log(chalk.blue.bold("\n🩺 BackGen - Project Health Check\n"));

  const projectDir = process.cwd();
  const checks: CheckResult[] = [];

  // Run all checks
  checks.push(await checkNodeVersion());
  checks.push(await checkNpm());
  checks.push(await checkProjectDir(projectDir));
  checks.push(await checkEnvFile(projectDir));
  checks.push(await checkDatabaseUrl(projectDir));
  const manifest = await readManifest(projectDir);
  const orm = manifest?.project?.orm ?? "prisma";
  checks.push(await checkSchemaFile(projectDir, orm));
  checks.push(await checkDependencies(projectDir));

  // Print results
  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    if (check.passed) {
      console.log(chalk.green(`✓ ${check.name}`));
      passed++;
    } else {
      console.log(chalk.red(`✗ ${check.name}`));
      console.log(chalk.gray(`  ${check.message}`));
      if (check.fix) {
        console.log(chalk.yellow(`  Fix: ${check.fix}`));
      }
      failed++;
    }
  }

  console.log("");
  if (failed === 0) {
    console.log(chalk.green.bold(`All ${passed} checks passed!`));
  } else {
    console.log(chalk.red.bold(`${failed} of ${passed + failed} check(s) failed.`));
  }
  console.log("");
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0]);

  return {
    name: `Node.js ${version}`,
    passed: major >= 18,
    message: major < 18 ? `Node.js 18+ required, found ${version}` : "",
    fix: major < 18 ? "Upgrade Node.js to 18 or later" : undefined,
  };
}

async function checkNpm(): Promise<CheckResult> {
  try {
    const version = execSync("npm --version", { encoding: "utf-8" }).trim();
    return {
      name: `npm ${version}`,
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: "npm",
      passed: false,
      message: "npm not found",
      fix: "Install Node.js (includes npm)",
    };
  }
}

async function checkProjectDir(dir: string): Promise<CheckResult> {
  try {
    await fs.access(path.join(dir, "package.json"));
    return {
      name: "Project directory",
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: "Project directory",
      passed: false,
      message: "Not in a BackGen project directory (package.json not found)",
      fix: "Navigate to a BackGen project directory",
    };
  }
}

async function checkEnvFile(dir: string): Promise<CheckResult> {
  try {
    await fs.access(path.join(dir, ".env"));
    return {
      name: ".env file",
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: ".env file",
      passed: false,
      message: ".env file not found",
      fix: "cp .env.example .env",
    };
  }
}

async function checkDatabaseUrl(dir: string): Promise<CheckResult> {
  try {
    const envContent = await fs.readFile(path.join(dir, ".env"), "utf-8");
    const hasDbUrl = envContent.includes("DATABASE_URL=");

    return {
      name: "DATABASE_URL",
      passed: hasDbUrl,
      message: hasDbUrl ? "" : "DATABASE_URL not set in .env",
      fix: hasDbUrl ? undefined : 'Add DATABASE_URL="postgresql://..." to .env',
    };
  } catch {
    return {
      name: "DATABASE_URL",
      passed: false,
      message: "Cannot read .env file",
    };
  }
}

async function checkSchemaFile(dir: string, orm: string): Promise<CheckResult> {
  const schemaPaths: Record<string, string> = {
    prisma: path.join(dir, "prisma", "schema.prisma"),
    drizzle: path.join(dir, "src", "db", "schema"),
    mongoose: path.join(dir, "src", "models"),
  };
  const labels: Record<string, string> = {
    prisma: "Prisma schema",
    drizzle: "Drizzle schema files",
    mongoose: "Mongoose models",
  };
  const schemaPath = schemaPaths[orm] ?? schemaPaths.prisma;
  try {
    await fs.access(schemaPath);
    return {
      name: labels[orm] ?? "Schema",
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: labels[orm] ?? "Schema",
      passed: false,
      message: `${schemaPath} not found`,
      fix: "Run BackGen init to generate project",
    };
  }
}

async function checkDependencies(dir: string): Promise<CheckResult> {
  try {
    await fs.access(path.join(dir, "node_modules"));
    return {
      name: "Dependencies",
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: "Dependencies",
      passed: false,
      message: "node_modules not found",
      fix: "Run npm install",
    };
  }
}
