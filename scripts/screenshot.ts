import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.APP_URL || "http://localhost:4173";
const route = process.argv[2] || "/dashboard";
const outputPath = resolve(
  projectRoot,
  process.argv[3] || "tmp/work-calendar.png",
);

async function waitForServer(url: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The Vite preview server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Vite preview server did not respond at ${url}`);
}

async function main() {
  const server = process.env.APP_URL
    ? null
    : spawn("bun", ["--no-orphans", "run", "preview"], {
        cwd: projectRoot,
        stdio: ["ignore", "inherit", "inherit"],
      });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    await waitForServer(baseUrl);
    await mkdir(dirname(outputPath), { recursive: true });
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: "networkidle",
    });
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`Screenshot saved: ${outputPath}`);
  } finally {
    await browser?.close();
    server?.kill("SIGTERM");
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
