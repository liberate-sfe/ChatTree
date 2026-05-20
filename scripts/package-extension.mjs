import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";
import yazl from "yazl";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const releaseDir = path.join(rootDir, "release");
const packagePath = path.join(rootDir, "package.json");
const manifestPath = path.join(distDir, "manifest.json");

const packageJson = JSON.parse(await fsp.readFile(packagePath, "utf8"));
const version = packageJson.version ?? "0.0.0";
const zipName = `chattree-chrome-v${version}.zip`;
const zipPath = path.join(releaseDir, zipName);

await validateDistPackage();
await fsp.mkdir(releaseDir, { recursive: true });
await fsp.rm(zipPath, { force: true });

const files = await collectFiles(distDir);
await writeZip(files, zipPath);

const stats = await fsp.stat(zipPath);
console.log(`Created ${path.relative(rootDir, zipPath)}`);
console.log(`Included ${files.length} files, ${(stats.size / 1024).toFixed(1)} KiB`);

async function validateDistPackage() {
  if (!fs.existsSync(distDir)) {
    throw new Error("dist/ does not exist. Run pnpm build before packaging.");
  }

  const manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));

  // Keep this validation close to the Chrome Web Store review surface: manifest,
  // permissions, host access, icons, UI pages, and packaged local code.
  assert(manifest.manifest_version === 3, "manifest_version must be 3.");
  assert(manifest.name === "ChatTree", "manifest name must remain ChatTree.");
  assert(Boolean(manifest.background?.service_worker), "background.service_worker is required.");
  assert(Boolean(manifest.options_page), "options_page is required for API key setup.");
  assert(Boolean(manifest.action?.default_popup), "action.default_popup is required.");

  const permissions = new Set(manifest.permissions ?? []);
  assert(permissions.has("storage"), "storage permission is required for local settings.");
  assert(permissions.size === 1, "Unexpected Chrome permissions found. Re-check least-privilege scope.");

  const hostPermissions = new Set(manifest.host_permissions ?? []);
  const requiredHosts = [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ];
  for (const host of requiredHosts) {
    assert(hostPermissions.has(host), `Missing host permission: ${host}`);
  }
  assert(!hostPermissions.has("<all_urls>"), "Do not use <all_urls>; keep host access narrow.");

  const contentMatches = new Set((manifest.content_scripts ?? []).flatMap((script) => script.matches ?? []));
  for (const host of requiredHosts.slice(0, 4)) {
    assert(contentMatches.has(host), `Missing content script match: ${host}`);
  }

  const requiredFiles = [
    "manifest.json",
    manifest.options_page,
    manifest.action.default_popup,
    manifest.icons?.["128"]
  ];
  for (const relativeFile of requiredFiles) {
    assert(relativeFile && fs.existsSync(path.join(distDir, relativeFile)), `Missing packaged file: ${relativeFile}`);
  }
}

async function collectFiles(dir, relativeBase = "") {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.join(relativeBase, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, relativePath));
      continue;
    }

    // Avoid packaging local OS/editor artifacts if they ever appear in dist/.
    if (entry.name === ".DS_Store" || entry.name.endsWith(".log")) {
      continue;
    }

    files.push({ absolutePath, relativePath: toZipPath(relativePath) });
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function writeZip(files, outputPath) {
  return new Promise((resolve, reject) => {
    const zipFile = new yazl.ZipFile();
    const output = fs.createWriteStream(outputPath);

    output.on("close", resolve);
    output.on("error", reject);
    zipFile.outputStream.on("error", reject);
    zipFile.outputStream.pipe(output);

    for (const file of files) {
      zipFile.addFile(file.absolutePath, file.relativePath);
    }

    zipFile.end();
  });
}

function toZipPath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
