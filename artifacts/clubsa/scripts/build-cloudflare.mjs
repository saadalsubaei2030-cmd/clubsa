import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const artifactRoot = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(artifactRoot, "dist", "public");
const executable = process.platform === "win32" ? "vite.cmd" : "vite";
const viteCandidates = [
  path.join(artifactRoot, "node_modules", ".bin", executable),
  path.resolve(artifactRoot, "..", "..", "node_modules", ".bin", executable),
];
const viteBin = viteCandidates.find((candidate) => existsSync(candidate));

if (!viteBin) {
  console.error(
    "CLUBSA build could not find Vite. Install dependencies with pnpm or Bun before building.",
  );
  process.exit(1);
}

rmSync(outputDir, { recursive: true, force: true });

const result = spawnSync(
  viteBin,
  ["build", "--config", "vite.config.ts", "--mode", "production"],
  {
    cwd: artifactRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      BASE_PATH: process.env.BASE_PATH || "/",
      PORT: process.env.PORT || "4173",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!existsSync(path.join(outputDir, "index.html"))) {
  console.error(`CLUBSA build did not produce ${path.relative(process.cwd(), outputDir)}/index.html`);
  process.exit(1);
}

console.log(`CLUBSA static output: ${path.relative(process.cwd(), outputDir)}`);