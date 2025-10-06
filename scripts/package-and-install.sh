#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f package.json ]; then
  node <<'NODE'
const fs = require('fs');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  const meta = JSON.parse(fs.readFileSync('meta.json','utf8'));
  const parts = pkg.version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error('invalid version string: ' + pkg.version);
  }
  parts[2] += 1;
  pkg.version = parts.join('.');
  meta.version = pkg.version;
  meta.builtAt = new Date().toISOString();
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync('meta.json', JSON.stringify(meta, null, 2) + '\n');
  console.log('[version] bumped to ' + pkg.version);
} catch (err) {
  console.error('[version] bump failed:', err.message);
  process.exit(1);
}
NODE
fi

echo "[package] bundling VSIX via vsce" >&2
npx vsce package --no-yarn

VSIX_NAME="$(node -p "const pkg=require('./package.json'); pkg.name + '-' + pkg.version + '.vsix'")"
VSIX_PATH="$ROOT_DIR/$VSIX_NAME"

if [ ! -f "$VSIX_PATH" ]; then
  echo "VSIX not found at $VSIX_PATH" >&2
  exit 1
fi

echo "[cleanup] removing old extension versions" >&2
EXT_DIR="$HOME/.vscode/extensions"
if [ -d "$EXT_DIR" ]; then
  find "$EXT_DIR" -maxdepth 1 -type d -name "kars.kars-commit-ai-*" | while read -r dir; do
    rm -rf "$dir"
    echo "  removed $(basename "$dir")" >&2
  done
fi

echo "[install] installing $VSIX_NAME into VS Code" >&2
code --install-extension "$VSIX_PATH" --force

echo "[done] $VSIX_NAME installed" >&2
