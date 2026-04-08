#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Recent tags:"
if git tag --sort=-creatordate | head -10 | sed 's/^/  - /'; then
  :
else
  echo "  (no tags yet)"
fi

echo
echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
echo "HEAD:           $(git rev-parse --short HEAD)"
echo

read -r -p "New tag name (for example v0.3.2): " TAG_NAME

if [[ -z "$TAG_NAME" ]]; then
  echo "No tag provided, aborting."
  exit 1
fi

if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "Tag '$TAG_NAME' already exists, aborting."
  exit 1
fi

echo
read -r -p "Create annotated tag '$TAG_NAME'? [y/N] " CONFIRM_CREATE
if [[ ! "$CONFIRM_CREATE" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

git tag -a "$TAG_NAME" -m "$TAG_NAME"
echo "Created tag: $TAG_NAME"
echo

read -r -p "Push current branch and all tags now? [y/N] " CONFIRM_PUSH_ALL
if [[ "$CONFIRM_PUSH_ALL" =~ ^[Yy]$ ]]; then
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  git push origin "$CURRENT_BRANCH"
  git push origin --tags
  echo "Pushed branch '$CURRENT_BRANCH' and all tags."
  exit 0
fi

read -r -p "Push only tag '$TAG_NAME' now? [y/N] " CONFIRM_PUSH_TAG
if [[ "$CONFIRM_PUSH_TAG" =~ ^[Yy]$ ]]; then
  git push origin "$TAG_NAME"
  echo "Pushed tag '$TAG_NAME'."
  exit 0
fi

echo "Tag created locally only."
