import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";
import { TemplateEngine } from "./template-engine.js";
import { addPluginToManifest, removePluginFromManifest } from "./manifest.js";
import { checkConflicts, checkRequirements } from "./plugin-registry.js";
import { getInstalledPlugins } from "./manifest.js";
import type { BackGenPlugin, FileMutation, InstallContext } from "./plugin.js";

export class PluginInstaller {
  private engine: TemplateEngine;

  constructor(templatesDir: string) {
    this.engine = new TemplateEngine(templatesDir);
  }

  async install(projectDir: string, plugin: BackGenPlugin): Promise<void> {
    const projectName = path.basename(projectDir);
    const installed = Object.keys(await getInstalledPlugins(projectDir));

    // Check conflicts
    const conflicts = checkConflicts(plugin.name, installed);
    if (conflicts.length > 0) {
      throw new Error(
        `Plugin "${plugin.name}" conflicts with: ${conflicts.join(", ")}. Remove them first.`
      );
    }

    // Check requirements
    const missing = checkRequirements(plugin.name, installed);
    if (missing.length > 0) {
      throw new Error(
        `Plugin "${plugin.name}" requires: ${missing.join(", ")}. Install them first.`
      );
    }

    // Build install context
    const ctx: InstallContext = {
      projectDir,
      projectName,
      engine: this.engine,
      mutate: (mutations: FileMutation[]) => this.applyMutations(projectDir, mutations),
    };

    // Run plugin install lifecycle
    await plugin.install(ctx);

    // Inject env vars into .env.example
    if (plugin.env) {
      await this.injectEnvVars(projectDir, plugin.name, plugin.env);
    }

    // Install npm dependencies
    if (plugin.dependencies?.length || plugin.devDependencies?.length) {
      await this.installDependencies(projectDir, plugin);
    }

    // Update manifest
    await addPluginToManifest(projectDir, plugin.name, plugin.version, "core");
  }

  async uninstall(projectDir: string, plugin: BackGenPlugin): Promise<void> {
    const projectName = path.basename(projectDir);

    // Run plugin uninstall lifecycle
    if (plugin.uninstall) {
      const ctx: InstallContext = {
        projectDir,
        projectName,
        engine: this.engine,
        mutate: (mutations: FileMutation[]) => this.applyMutations(projectDir, mutations),
      };
      await plugin.uninstall(ctx);
    }

    // Remove env vars from .env.example
    if (plugin.env) {
      await this.removeEnvVars(projectDir, plugin.name);
    }

    // Update manifest
    await removePluginFromManifest(projectDir, plugin.name);
  }

  private async applyMutations(projectDir: string, mutations: FileMutation[]): Promise<void> {
    for (const mutation of mutations) {
      const filePath = path.join(projectDir, mutation.file);
      let content: string;

      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        // File doesn't exist, skip
        continue;
      }

      switch (mutation.operation) {
        case "append":
          content += "\n" + mutation.content;
          break;
        case "prepend":
          content = mutation.content + "\n" + content;
          break;
        case "replace":
          if (mutation.marker && content.includes(mutation.marker)) {
            content = content.replace(mutation.marker, mutation.content);
          }
          break;
      }

      await fs.writeFile(filePath, content, "utf-8");
    }
  }

  private async injectEnvVars(
    projectDir: string,
    pluginName: string,
    env: Record<string, string>
  ): Promise<void> {
    const envExamplePath = path.join(projectDir, ".env.example");
    let content: string;

    try {
      content = await fs.readFile(envExamplePath, "utf-8");
    } catch {
      return;
    }

    const marker = `# ${pluginName} plugin`;
    if (content.includes(marker)) return; // already injected

    const envLines = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    content += `\n\n${marker}\n${envLines}\n`;
    await fs.writeFile(envExamplePath, content, "utf-8");
  }

  private async removeEnvVars(projectDir: string, pluginName: string): Promise<void> {
    const envExamplePath = path.join(projectDir, ".env.example");

    try {
      let content = await fs.readFile(envExamplePath, "utf-8");
      const marker = `# ${pluginName} plugin`;
      const startIdx = content.indexOf(marker);
      if (startIdx === -1) return;

      content = content.slice(0, startIdx).trimEnd() + "\n";
      await fs.writeFile(envExamplePath, content, "utf-8");
    } catch {
      // .env.example doesn't exist
    }
  }

  private async installDependencies(projectDir: string, plugin: BackGenPlugin): Promise<void> {
    const deps = plugin.dependencies ?? [];
    const devDeps = plugin.devDependencies ?? [];

    if (deps.length === 0 && devDeps.length === 0) return;

    // Read package.json and add dependencies
    const pkgPath = path.join(projectDir, "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));

    for (const dep of deps) {
      if (!pkg.dependencies?.[dep]) {
        pkg.dependencies = pkg.dependencies ?? {};
        pkg.dependencies[dep] = "latest";
      }
    }

    for (const dep of devDeps) {
      if (!pkg.devDependencies?.[dep]) {
        pkg.devDependencies = pkg.devDependencies ?? {};
        pkg.devDependencies[dep] = "latest";
      }
    }

    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

    // Run npm install
    await new Promise<void>((resolve, reject) => {
      const child = spawn("npm", ["install"], {
        cwd: projectDir,
        stdio: "inherit",
        shell: true,
      });
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm install exited with code ${code}`));
      });
      child.on("error", reject);
    });
  }
}
