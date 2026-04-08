#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

START_TAG="${1:-}"
if [[ "$START_TAG" == "--" ]]; then
  START_TAG="${2:-}"
fi

LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"

if [[ -n "$START_TAG" ]]; then
  RANGE="${START_TAG}..HEAD"
  echo "## Changes since ${START_TAG}"
elif [[ -n "$LAST_TAG" ]]; then
  RANGE="${LAST_TAG}..HEAD"
  echo "## Changes since ${LAST_TAG}"
else
  RANGE="HEAD"
  echo "## Changes"
fi

echo
COMMITS="$(git log --pretty=format:'- %s' ${RANGE})"

if [[ -n "$COMMITS" ]]; then
  printf '%s\n' "$COMMITS"
else
  echo "- No changes"
fi
