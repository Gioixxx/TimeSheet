import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const serverJs = path.join(standalone, "server.js");
const serverMjs = path.join(standalone, "server.mjs");

if (!fs.existsSync(serverJs) && !fs.existsSync(serverMjs)) {
  console.error(
    "Missing .next/standalone server entry. Run `next build` with output: standalone first.",
  );
  process.exit(1);
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");

if (!fs.existsSync(staticSrc)) {
  console.error("Missing .next/static. Run `next build` first.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(staticDest), { recursive: true });
fs.cpSync(staticSrc, staticDest, { recursive: true });
fs.cpSync(publicSrc, publicDest, { recursive: true });

console.log("Standalone bundle ready:", standalone);
