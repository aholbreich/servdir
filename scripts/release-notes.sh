#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

START_TAG="${1:-}"
if [[ "$START_TAG" == "--" ]]; then
  START_TAG="${2:-}"
fi

LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"

print_available_tags() {
  local tags
  tags="$(git tag --list)"

  if [[ -n "$tags" ]]; then
    echo
    echo "Available tags:"
    printf '%s\n' "$tags"
  else
    echo
    echo "No tags exist in this repository yet."
  fi
}

if [[ -n "$START_TAG" ]]; then
  if ! git rev-parse --verify --quiet "refs/tags/${START_TAG}" >/dev/null; then
    echo "Error: tag '${START_TAG}' does not exist locally." >&2
    echo "Tip: check the tag name or fetch tags from origin." >&2
    print_available_tags >&2
    exit 1
  fi

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
