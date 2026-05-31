import Handlebars from "handlebars";
import * as fs from "fs/promises";
import * as path from "path";

export interface TemplateContext {
  [key: string]: unknown;
}

export class TemplateEngine {
  private templatesDir: string;

  constructor(templatesDir: string) {
    this.templatesDir = templatesDir;
  }

  async render(templatePath: string, context: TemplateContext): Promise<string> {
    const fullPath = path.join(this.templatesDir, templatePath);
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

  async listTemplates(): Promise<string[]> {
    return this.walkDir(this.templatesDir);
  }

  private async walkDir(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.walkDir(fullPath)));
      } else {
        files.push(path.relative(this.templatesDir, fullPath));
      }
    }

    return files;
  }
}
