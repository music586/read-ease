import { access, readFile } from "node:fs/promises";

const required = [
  "dist/manifest.json",
  "dist/background.js",
  "dist/content.js",
  "dist/icons/icon-16.png",
  "dist/icons/icon-32.png",
  "dist/icons/icon-48.png",
  "dist/icons/icon-128.png",
];

await Promise.all(required.map((file) => access(file)));
const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("Expected a Manifest V3 extension");
}
if (manifest.host_permissions) {
  throw new Error("Permanent host permissions are not allowed");
}

console.log(`Verified ${required.length} packaged extension files`);

