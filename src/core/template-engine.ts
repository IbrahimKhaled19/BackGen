import Handlebars from "handlebars";
import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";

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
    const files = await glob("**/*.hbs", { cwd: this.templatesDir });
    return files;
  }
}
