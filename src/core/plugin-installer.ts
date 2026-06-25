import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";
import { TemplateEngine } from "./template-engine.js";
import { addPluginToManifest, readManifest, removePluginFromManifest, getInstalledPlugins } from "./manifest.js";
import { checkConflicts, checkRequirements } from "./plugin-registry.js";
import type { BackGenPlugin, FileMutation, InstallContext } from "./plugin.js";

export class PluginInstaller {
  private engine: TemplateEngine;
  private orm: string;

  constructor(templatesDir: string, orm: string = "prisma") {
    this.orm = orm;
    const ormTemplatesDir = path.resolve(
      templatesDir,
      "..",
      `express.${orm}`
    );
    this.engine = new TemplateEngine(templatesDir, ormTemplatesDir);
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
    const missing = checkRequirements(plugin.name, installed, this.orm);
    if (missing.length > 0) {
      throw new Error(
        `Plugin "${plugin.name}" requires: ${missing.join(", ")}. Install them first.`
      );
    }

    // Set up file tracking for clean uninstall
    const trackedFiles: string[] = [];
    const fileSnapshots: Record<string, string> = {};

    // Proxy engine to intercept renderAbsolute calls
    const trackingEngine = new Proxy<TemplateEngine>(this.engine, {
      get(target, prop) {
        if (prop === "renderAbsolute") {
          return async (
            templatePath: string,
            context: Record<string, unknown>,
            outputPath: string
          ) => {
            trackedFiles.push(outputPath);
            return target.renderAbsolute(templatePath, context, outputPath);
          };
        }
        const val = Reflect.get(target, prop);
        return typeof val === "function" ? val.bind(target) : val;
      },
    });

    // Wrapper mutate that snapshots original content before mutation
    const trackingMutate = async (mutations: FileMutation[]) => {
      for (const mutation of mutations) {
        const absPath = path.join(projectDir, mutation.file);
        if (!fileSnapshots[absPath]) {
          try {
            fileSnapshots[absPath] = await fs.readFile(absPath, "utf-8");
          } catch {
            // File doesn't exist yet — nothing to snapshot
          }
        }
      }
      await this.applyMutations(projectDir, mutations);
    };

    // Build install context with tracking engine + mutate + trackFile
    const ctx: InstallContext = {
      projectDir,
      projectName,
      orm: this.orm,
      engine: trackingEngine,
      mutate: trackingMutate,
      trackFile: (file: string) => {
        trackedFiles.push(file);
      },
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

    // Update manifest with tracking data
    await addPluginToManifest(
      projectDir,
      plugin.name,
      plugin.version,
      "core",
      trackedFiles,
      fileSnapshots
    );
  }

  async uninstall(projectDir: string, plugin: BackGenPlugin): Promise<void> {
    const projectName = path.basename(projectDir);

    // Read tracking data from manifest
    const manifest = await readManifest(projectDir);
    const pluginMeta = manifest?.plugins?.[plugin.name];
    const trackedFiles = pluginMeta?.files ?? [];
    const fileSnapshots = pluginMeta?.fileSnapshots ?? {};

    // Delete tracked files created during install
    for (const filePath of trackedFiles) {
      try {
        await fs.unlink(filePath);
      } catch {
        // File may already be deleted or never existed
      }
    }

    // Restore original content for mutated files
    for (const [filePath, originalContent] of Object.entries(fileSnapshots)) {
      try {
        await fs.writeFile(filePath, originalContent, "utf-8");
      } catch {
        // Parent directory may have been removed
      }
    }

    // Remove npm dependencies added by plugin
    await this.removeDependencies(projectDir, plugin);

    // Run plugin uninstall lifecycle
    if (plugin.uninstall) {
      const ctx: InstallContext = {
        projectDir,
        projectName,
        orm: this.orm,
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

  async installBulk(projectDir: string, pluginNames: string[]): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const name of pluginNames) {
      const { getPlugin } = await import("./plugin-registry.js");
      const plugin = getPlugin(name);
      if (!plugin) {
        console.warn(`  ⚠ Unknown plugin "${name}" — skipping`);
        failed.push(name);
        continue;
      }

      try {
        await this.install(projectDir, plugin);
        succeeded.push(name);
      } catch (err) {
        console.warn(`  ⚠ ${name} failed: ${(err as Error).message}`);
        failed.push(name);
      }
    }

    return { succeeded, failed };
  }

  async applyMutations(projectDir: string, mutations: FileMutation[]): Promise<void> {
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
            // Idempotent: skip if replacement content already exists in file.
            // Prevents duplicate imports/middleware on re-sync when plugins
            // self-reference their own marker in the replacement payload.
            const insertion = mutation.content.replace(mutation.marker, "").trim();
            if (insertion && content.includes(insertion)) break;
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
    const marker = `# ${pluginName} plugin`;
    await this.removeEnvSection(path.join(projectDir, ".env.example"), marker);
    await this.removeEnvSection(path.join(projectDir, ".env"), marker);
  }

  /** Remove a marker-delimited section from an env file */
  private async removeEnvSection(filePath: string, marker: string): Promise<void> {
    try {
      let content = await fs.readFile(filePath, "utf-8");
      const startIdx = content.indexOf(marker);
      if (startIdx === -1) return;

      content = content.slice(0, startIdx).trimEnd() + "\n";
      await fs.writeFile(filePath, content, "utf-8");
    } catch {
      // File doesn't exist
    }
  }

  private async installDependencies(projectDir: string, plugin: BackGenPlugin): Promise<void> {
    const deps = plugin.dependencies ?? [];
    const devDeps = plugin.devDependencies ?? [];

    if (deps.length === 0 && devDeps.length === 0) return;

    // Read package.json and add dependencies
    const pkgPath = path.join(projectDir, "package.json");
    let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
      pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
    } catch {
      // package.json missing (e.g. --skip-install in tests). Log + continue.
      console.warn(`[${plugin.name}] package.json not found, skipping dep injection. Run \`npm install\` then re-run \`backgen sync\`.`);
      return;
    }

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

    // Run npm install (non-fatal — templates and manifest update are primary)
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("npm", ["install"], {
          cwd: projectDir,
          stdio: "pipe",
          shell: true,
        });
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`npm install exited with code ${code}`));
        });
        child.on("error", reject);
      });
    } catch {
      // npm install failed — plugin templates and manifest still updated
    }
  }

  private async removeDependencies(projectDir: string, plugin: BackGenPlugin): Promise<void> {
    const deps = plugin.dependencies ?? [];
    const devDeps = plugin.devDependencies ?? [];

    if (deps.length === 0 && devDeps.length === 0) return;

    const pkgPath = path.join(projectDir, "package.json");
    let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
      pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
    } catch {
      // package.json not found — nothing to clean up
      return;
    }

    let changed = false;
    for (const dep of deps) {
      if (pkg.dependencies?.[dep]) {
        delete pkg.dependencies[dep];
        changed = true;
      }
    }
    for (const dep of devDeps) {
      if (pkg.devDependencies?.[dep]) {
        delete pkg.devDependencies[dep];
        changed = true;
      }
    }

    if (changed) {
      if (pkg.dependencies && Object.keys(pkg.dependencies).length === 0) delete pkg.dependencies;
      if (pkg.devDependencies && Object.keys(pkg.devDependencies).length === 0) delete pkg.devDependencies;
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    }
  }
}
