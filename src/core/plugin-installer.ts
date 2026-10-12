import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";
import { TemplateEngine } from "./template-engine.js";
import { addPluginToManifest, readManifest, removePluginFromManifest, getInstalledPlugins } from "./manifest.js";
import { checkConflicts, checkRequirements } from "./plugin-registry.js";
import type { BackGenPlugin, FileMutation, InstallContext, AppliedMutation } from "./plugin.js";

/** Render a plugin's env vars as the KEY=value lines appended to an env file */
function envBlock(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

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

  async install(
    projectDir: string,
    plugin: BackGenPlugin,
    options: { skipInstall?: boolean } = {}
  ): Promise<void> {
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
    // Content of files that already existed before this plugin ran. Restored on
    // uninstall instead of deleting, so overwriting a shared file (e.g. the
    // base src/middleware/auth.ts stub) is reversible.
    const overwrites: Record<string, string> = {};
    // Per-mutation record of the exact text this plugin inserted. Reverting
    // these — rather than restoring a whole-file snapshot — means uninstalling
    // one plugin never rolls back edits made by plugins installed after it.
    const appliedMutations: AppliedMutation[] = [];

    // Proxy engine to intercept renderAbsolute calls
    const trackingEngine = new Proxy<TemplateEngine>(this.engine, {
      get(target, prop) {
        if (prop === "renderAbsolute") {
          return async (
            templatePath: string,
            context: Record<string, unknown>,
            outputPath: string
          ) => {
            // Remember the previous content if this file is about to be replaced
            if (!(outputPath in overwrites)) {
              try {
                overwrites[outputPath] = await fs.readFile(outputPath, "utf-8");
              } catch {
                // New file — nothing to preserve, it gets deleted on uninstall
              }
            }
            trackedFiles.push(outputPath);
            return target.renderAbsolute(templatePath, context, outputPath);
          };
        }
        const val = Reflect.get(target, prop);
        return typeof val === "function" ? val.bind(target) : val;
      },
    });

    /**
     * The exact text a mutation adds to a file.
     *
     * For `replace`, applyMutations substitutes the marker with `content`, and
     * `content` conventionally carries the marker at the end so the marker
     * survives. Only the part before the marker actually lands in the file.
     */
    const insertedTextOf = (mutation: FileMutation): string =>
      mutation.operation === "replace" && mutation.marker
        ? mutation.content.split(mutation.marker)[0]
        : mutation.content;

    // Wrapper mutate that records the exact text inserted per mutation
    const trackingMutate = async (mutations: FileMutation[]) => {
      for (const mutation of mutations) {
        appliedMutations.push({
          file: mutation.file,
          operation: mutation.operation,
          inserted: insertedTextOf(mutation),
        });
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
    if (!options.skipInstall && (plugin.dependencies?.length || plugin.devDependencies?.length)) {
      await this.installDependencies(projectDir, plugin);
    }

    // Update manifest with tracking data
    await addPluginToManifest(
      projectDir,
      plugin.name,
      plugin.version,
      "core",
      trackedFiles,
      appliedMutations,
      overwrites
    );
  }

  async uninstall(projectDir: string, plugin: BackGenPlugin): Promise<void> {
    const projectName = path.basename(projectDir);

    // Read tracking data from manifest
    const manifest = await readManifest(projectDir);
    const pluginMeta = manifest?.plugins?.[plugin.name];
    const trackedFiles = pluginMeta?.files ?? [];
    const appliedMutations = pluginMeta?.mutations ?? [];
    const overwrites = pluginMeta?.overwrites ?? {};

    // Delete files this plugin created; restore files it overwrote
    for (const filePath of trackedFiles) {
      if (filePath in overwrites) {
        try {
          await fs.writeFile(filePath, overwrites[filePath], "utf-8");
        } catch {
          // Parent directory may have been removed
        }
        continue;
      }
      try {
        await fs.unlink(filePath);
      } catch {
        // File may already be deleted or never existed
      }
    }

    // Revert only this plugin's own insertions, leaving edits made by other
    // plugins (installed before or after) untouched.
    await this.revertMutations(projectDir, appliedMutations);

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

    // Remove env vars this plugin added
    if (plugin.env) {
      await this.removeEnvVars(projectDir, plugin.name, plugin.env);
    }

    // Update manifest
    await removePluginFromManifest(projectDir, plugin.name);
  }

  /**
   * Undo a set of recorded mutations by removing the exact text each one
   * inserted. Idempotent: a mutation whose text is no longer present is
   * skipped, which is what happens when the user edited the file by hand.
   */
  private async revertMutations(
    projectDir: string,
    mutations: AppliedMutation[]
  ): Promise<void> {
    // Group by file so each file is read and written once.
    const byFile = new Map<string, string[]>();
    for (const mutation of mutations) {
      if (!mutation.inserted) continue;
      const list = byFile.get(mutation.file) ?? [];
      list.push(mutation.inserted);
      byFile.set(mutation.file, list);
    }

    for (const [file, insertions] of byFile) {
      const filePath = path.join(projectDir, file);
      let content: string;
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        continue; // File deleted with a tracked plugin file
      }

      let changed = false;
      for (const inserted of insertions) {
        const idx = content.indexOf(inserted);
        if (idx === -1) continue;
        content = content.slice(0, idx) + content.slice(idx + inserted.length);
        changed = true;
      }

      if (!changed) continue;

      // Collapse the blank-line pile-up left behind by removed blocks.
      content = content.replace(/\n{3,}/g, "\n\n");

      try {
        await fs.writeFile(filePath, content, "utf-8");
      } catch {
        // File may be read-only or deleted — nothing else to do
      }
    }
  }

  async installBulk(
    projectDir: string,
    pluginNames: string[],
    options: { skipInstall?: boolean } = {}
  ): Promise<{ succeeded: string[]; failed: string[] }> {
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
        await this.install(projectDir, plugin, options);
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

    // Only add keys no other plugin already wrote, so the file never has two
    // definitions of the same variable with different values.
    const lines: string[] = [];
    for (const [key, value] of Object.entries(env)) {
      if (new RegExp(`^${key}=`, "m").test(content)) continue;
      lines.push(`${key}=${value}`);
    }
    if (lines.length === 0) return;

    content += `\n\n${marker}\n${lines.join("\n")}\n`;
    await fs.writeFile(envExamplePath, content, "utf-8");
  }

  private async removeEnvVars(
    projectDir: string,
    pluginName: string,
    env: Record<string, string>
  ): Promise<void> {
    const marker = `# ${pluginName} plugin`;
    // Rebuild the exact block injectEnvVars appended, so removal cannot touch
    // anything the user added afterwards.
    const block = `${marker}\n${envBlock(env)}\n`;

    for (const file of [".env.example", ".env"]) {
      const filePath = path.join(projectDir, file);
      if (await this.removeExactText(filePath, block)) continue;
      await this.removeEnvSection(filePath, marker);
    }
  }

  /** Remove `text` from a file if present. Returns true when it was found. */
  private async removeExactText(filePath: string, text: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const idx = content.indexOf(text);
      if (idx === -1) return false;

      const before = content.slice(0, idx).trimEnd();
      const after = content.slice(idx + text.length).replace(/^\n+/, "");
      const next = after ? "\n" + after : "\n";

      await fs.writeFile(filePath, before + next, "utf-8");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove a plugin's marker-delimited block from an env file.
   *
   * Only the lines between this plugin's marker and the next plugin marker
   * (or EOF) are deleted. Truncating at the marker instead would silently
   * wipe every variable the user added after the plugin was installed.
   */
  private async removeEnvSection(filePath: string, marker: string): Promise<void> {
    const markerPattern = /^# .+ plugin$/m;

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const startIdx = content.indexOf(marker);
      if (startIdx === -1) return;

      // End of this block: the next plugin marker after ours, or EOF.
      const rest = content.slice(startIdx + marker.length);
      const nextMarker = rest.match(markerPattern);
      const endIdx = nextMarker?.index !== undefined
        ? startIdx + marker.length + nextMarker.index
        : content.length;

      const before = content.slice(0, startIdx).trimEnd();
      const after = content.slice(endIdx);
      const next = after ? "\n" + after.replace(/^\n+/, "") : "";

      await fs.writeFile(filePath, before + next + (next ? "" : "\n"), "utf-8");
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
        const child = spawn("npm", ["install", "--ignore-scripts"], {
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
