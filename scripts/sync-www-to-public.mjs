import fs from "node:fs";
import path from "node:path";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function isIgnoredInPublic(rel) {
  const norm = rel.replace(/\\/g, "/");
  // Keep our dynamic category template + storefront runtime.
  if (norm === "catalog/_category.html") return true;
  if (norm === "assets/storefront.js") return true;
  return false;
}

function copyDir(srcDir, dstDir) {
  ensureDir(dstDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(srcDir, e.name);
    const dst = path.join(dstDir, e.name);
    if (e.isDirectory()) {
      copyDir(src, dst);
    } else if (e.isFile()) {
      fs.copyFileSync(src, dst);
    }
  }
}

function sync() {
  const root = process.cwd();
  const www = path.join(root, "www");
  const pub = path.join(root, "public");

  if (!fs.existsSync(www)) throw new Error("Missing ./www folder");
  // Safety: avoid accidental overwrites in dev/CI. This script is legacy-only.
  if (process.env.ALLOW_WWW_SYNC !== "1") {
    throw new Error("Refusing to sync www/ -> public/ without ALLOW_WWW_SYNC=1");
  }
  ensureDir(pub);

  // 1) index.html
  fs.copyFileSync(path.join(www, "index.html"), path.join(pub, "index.html"));

  // 2) assets (merge; don't overwrite storefront.js)
  const wwwAssets = path.join(www, "assets");
  const pubAssets = path.join(pub, "assets");
  if (fs.existsSync(wwwAssets)) {
    ensureDir(pubAssets);
    for (const name of fs.readdirSync(wwwAssets)) {
      const rel = `assets/${name}`;
      if (isIgnoredInPublic(rel)) continue;
      fs.copyFileSync(path.join(wwwAssets, name), path.join(pubAssets, name));
    }
  }

  // 3) catalog (merge; don't overwrite _category.html)
  const wwwCatalog = path.join(www, "catalog");
  const pubCatalog = path.join(pub, "catalog");
  if (fs.existsSync(wwwCatalog)) {
    ensureDir(pubCatalog);
    for (const name of fs.readdirSync(wwwCatalog)) {
      const src = path.join(wwwCatalog, name);
      const dst = path.join(pubCatalog, name);
      if (name === "_category.html") continue;
      const stat = fs.statSync(src);
      if (stat.isDirectory()) {
        copyDir(src, dst);
      } else if (stat.isFile()) {
        fs.copyFileSync(src, dst);
      }
    }
  }
}

try {
  sync();
  console.log("Synced www/ -> public/ (kept storefront.js and _category.html).");
} catch (e) {
  console.error(e);
  process.exit(1);
}

