import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const packageJson = JSON.parse(await fsp.readFile(path.join(rootDir, "package.json"), "utf8"));
const defaultZipPath = path.join(rootDir, "release", `chattree-chrome-v${packageJson.version}.zip`);

const config = {
  publisherId: getRequiredEnv("CWS_PUBLISHER_ID"),
  itemId: getRequiredEnv("CWS_ITEM_ID"),
  clientId: getRequiredEnv("CWS_CLIENT_ID"),
  clientSecret: getRequiredEnv("CWS_CLIENT_SECRET"),
  refreshToken: getRequiredEnv("CWS_REFRESH_TOKEN"),
  zipPath: path.resolve(process.env.CWS_PACKAGE_PATH ?? defaultZipPath),
  publishAfterUpload: process.argv.includes("--publish") || process.env.CWS_PUBLISH_AFTER_UPLOAD === "1"
};

await ensurePackageExists(config.zipPath);
const accessToken = await refreshAccessToken(config);
const uploadResult = await uploadPackage(config, accessToken);

console.log(`Uploaded ${path.relative(rootDir, config.zipPath)} to Chrome Web Store item ${uploadResult.itemId ?? config.itemId}.`);
console.log(`Upload state: ${uploadResult.uploadState ?? "UNKNOWN"}`);
if (uploadResult.crxVersion) {
  console.log(`CRX version: ${uploadResult.crxVersion}`);
}

if (config.publishAfterUpload) {
  const publishResult = await publishItem(config, accessToken);
  console.log(`Publish request accepted for item ${config.itemId}.`);
  console.log(JSON.stringify(publishResult, null, 2));
} else {
  console.log("Not submitted for review. Re-run with --publish after the Store Listing, Privacy, Distribution, and Test instructions tabs are complete.");
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function ensurePackageExists(zipPath) {
  const stat = await fsp.stat(zipPath).catch(() => null);
  if (!stat?.isFile()) {
    throw new Error(`Package file not found: ${zipPath}. Run pnpm package:chrome first.`);
  }
}

async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Chrome Web Store access token: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Chrome Web Store token response did not include an access_token.");
  }

  return data.access_token;
}

async function uploadPackage({ publisherId, itemId, zipPath }, accessToken) {
  const packageBytes = await fsp.readFile(zipPath);
  const url = `https://chromewebstore.googleapis.com/upload/v2/publishers/${publisherId}/items/${itemId}:upload`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/zip"
    },
    body: packageBytes
  });

  if (!response.ok) {
    throw new Error(`Chrome Web Store upload failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function publishItem({ publisherId, itemId }, accessToken) {
  const url = `https://chromewebstore.googleapis.com/v2/publishers/${publisherId}/items/${itemId}:publish`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Chrome Web Store publish failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
