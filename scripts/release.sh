#!/usr/bin/env bash
# Release checklist for cyberfish-seekbrain.
# Usage: bash scripts/release.sh <new-version>
# The script:
#   1. bumps package.json + lib/version.js + scripts/copilotj-bridge.py UA
#   2. clears __pycache__ so npm pack does not ship .pyc
#   3. runs check + tests
#   4. builds dist/<name>-<version>.tgz via npm pack
#   5. commits, tags, prints follow-up commands for npm publish + market pin update
# It does NOT run npm publish or git push — those are manual, intentional steps.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "usage: bash scripts/release.sh <new-version>" >&2
  exit 1
fi

NAME=$(node -p "require('./package.json').name")
echo "==> releasing $NAME@$VERSION"

# 1. Bump version in all three places.
node -e "
const fs = require('node:fs')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '$VERSION'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
"
sed -i.bak "s/export const VERSION = '[^']*'/export const VERSION = '$VERSION'/" lib/version.js && rm lib/version.js.bak
sed -i.bak "s/PLUGIN_VERSION = '[^']*'/PLUGIN_VERSION = '$VERSION'/" scripts/copilotj-bridge.py && rm scripts/copilotj-bridge.py.bak

# 2. Clean __pycache__ before packing (npm 'files' whitelist would otherwise include .pyc).
find scripts -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find . -type d -name __pycache__ -path '*/scripts/*' -exec rm -rf {} + 2>/dev/null || true

# 3. Check + test.
npm run check
npm test

# 4. Pack into dist/.
mkdir -p dist
rm -f "dist/$NAME-$VERSION.tgz"
TARBALL=$(npm pack --pack-destination dist | tail -n1)
echo "==> built dist/$TARBALL"

# 5. Commit + tag.
git add -A
git commit -m "release $VERSION"
git tag "v$VERSION"
COMMIT=$(git rev-parse HEAD)
TS=$(date +%s)

cat <<EOF

==> next steps (manual):

1. Publish to npm:
     npm publish --access public

2. Update market/index.json:
     versions[0].version = "$VERSION"
     versions[0].publishTimestamp = $TS
     versions[0].source.commit = "$COMMIT"
   Commit + push to the gh-pages branch (or the host that serves market/index.json).

3. Push source:
     git push origin main
     git push origin v$VERSION
EOF
