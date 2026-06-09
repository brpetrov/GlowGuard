const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

const browsers = process.argv[2]
  ? [process.argv[2]]
  : ["chrome", "firefox"];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function build(browser) {
  const outDir = path.join(DIST, browser);

  // Clean previous build
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Bundle TypeScript entry points into JS
  await esbuild.build({
    entryPoints: [
      path.join(SRC, "background/service-worker.ts"),
      path.join(SRC, "content/anti-flash.ts"),
      path.join(SRC, "content/overlay.ts"),
      path.join(SRC, "popup/popup.ts"),
    ],
    bundle: true,
    outdir: outDir,
    format: "iife",
    target: "es2022",
    minify: false,
  });

  // Copy manifest
  fs.copyFileSync(
    path.join(ROOT, "manifests", browser, "manifest.json"),
    path.join(outDir, "manifest.json")
  );

  // Copy popup HTML + CSS
  fs.copyFileSync(
    path.join(SRC, "popup/popup.html"),
    path.join(outDir, "popup/popup.html")
  );
  fs.copyFileSync(
    path.join(SRC, "popup/popup.css"),
    path.join(outDir, "popup/popup.css")
  );

  // Copy icons
  copyDir(path.join(ROOT, "icons"), path.join(outDir, "icons"));

  console.log(`Built: dist/${browser}/`);
}

async function main() {
  for (const browser of browsers) {
    await build(browser);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
