import Handlebars from "handlebars";
import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";

export interface TemplateContext {
  [key: string]: unknown;
}

// Register Handlebars helpers
Handlebars.registerHelper("eq", function (a: unknown, b: unknown) {
  return a === b;
});

Handlebars.registerHelper("or", function (...args: unknown[]) {
  // Last arg is Handlebars options object
  const conditions = args.slice(0, -1);
  return conditions.some(Boolean);
});

export class TemplateEngine {
  private templatesDir: string;
  private ormTemplatesDir: string | null;

  constructor(templatesDir: string, ormTemplatesDir?: string) {
    this.templatesDir = templatesDir;
    this.ormTemplatesDir = ormTemplatesDir ?? null;
  }

  async resolveTemplate(relativePath: string): Promise<string> {
    // Check ORM-specific dir first
    if (this.ormTemplatesDir) {
      const ormPath = path.join(this.ormTemplatesDir, relativePath);
      try {
        await fs.access(ormPath);
        return ormPath;
      } catch {
        // Fall through to base
      }
    }
    // Fallback to base templates dir
    return path.join(this.templatesDir, relativePath);
  }

  async hasTemplate(relativePath: string): Promise<boolean> {
    try {
      await fs.access(await this.resolveTemplate(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async render(templatePath: string, context: TemplateContext): Promise<string> {
    const fullPath = await this.resolveTemplate(templatePath);
    const templateContent = await fs.readFile(fullPath, "utf-8");
    const template = Handlebars.compile(templateContent);
    return template(context);
  }

  async renderToFile(
    templatePath: string,
    context: TemplateContext,
    outputPath: string
  ): Promise<void> {
    const content = await this.render(templatePath, context);
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, content, "utf-8");
  }

  async renderAbsolute(
    absoluteTemplatePath: string,
    context: TemplateContext,
    outputPath: string
  ): Promise<void> {
    const templateContent = await fs.readFile(absoluteTemplatePath, "utf-8");
    const template = Handlebars.compile(templateContent);
    const content = template(context);
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, content, "utf-8");
  }

  async listTemplates(): Promise<string[]> {
    const files = await glob("**/*.hbs", { cwd: this.templatesDir });
    return files;
  }
}
