#!/usr/bin/env bash
# Drives the shorts CLI through a sandbox and asserts that a prompt package
# cannot be produced from an unapproved proposal.
set -euo pipefail

SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

cp shorts/current/shorts-state.json "$SANDBOX/shorts-state.json"
export SHORTS_DIR="$SANDBOX"
export SHORTS_STATE_PATH="$SANDBOX/shorts-state.json"

node tools/shorts-runner.mjs plan --copy shorts/fixtures/solar-storm-copy.txt --actor ci

if node tools/shorts-runner.mjs prompts --actor ci 2>/dev/null; then
  echo "FAIL: prompt package was generated without approval" >&2
  exit 1
fi
if [ -e "$SANDBOX/prompt-package.json" ]; then
  echo "FAIL: prompt package file was written without approval" >&2
  exit 1
fi

node tools/shorts-runner.mjs approve --actor ci
node tools/shorts-runner.mjs prompts --actor ci

COUNT="$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.env.SHORTS_DIR + "/prompt-package.json", "utf8")).prompts.length)')"
if [ "$COUNT" != "6" ]; then
  echo "FAIL: expected 6 prompts, got $COUNT" >&2
  exit 1
fi

echo "Shorts approval gate OK ($COUNT prompts)"
