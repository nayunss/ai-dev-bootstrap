import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const manifestNames = new Set(["package.json", "pom.xml", "build.gradle", "build.gradle.kts", "pyproject.toml"]);
const ignoredDirectories = new Set([
  ".git", ".tools", "node_modules", "target", "build", "dist", ".next", "coverage", "playwright-report", "test-results",
]);

const portable = (path) => path.split(sep).join("/") || ".";

export function discoverApplications(root) {
  const manifests = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) walk(join(directory, entry.name));
        continue;
      }
      if (entry.isFile() && manifestNames.has(entry.name)) {
        const manifest = portable(relative(root, join(directory, entry.name)));
        manifests.push({ root: portable(dirname(manifest)), manifest });
      }
    }
  };
  walk(resolve(root));
  return manifests.sort((left, right) => left.manifest.localeCompare(right.manifest));
}

export function readDeclaredInventory(root) {
  const path = join(root, "docs/development-environment.md");
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf8");
  for (const match of content.matchAll(/```json\s*([\s\S]*?)```/g)) {
    try {
      const value = JSON.parse(match[1]);
      if (Array.isArray(value?.applications)) return value;
    } catch {
      // Other JSON examples are allowed; only a block with an applications array is the inventory.
    }
  }
  return null;
}
