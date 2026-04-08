#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

latest_tag="$(git tag --sort=-version:refname | head -1)"
current_branch="$(git rev-parse --abbrev-ref HEAD)"
head_sha="$(git rev-parse --short HEAD)"
working_tree_state="$(git status --porcelain)"

suggest_next_patch_tag() {
  local tag="$1"

  if [[ "$tag" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    local major="${BASH_REMATCH[1]}"
    local minor="${BASH_REMATCH[2]}"
    local patch="${BASH_REMATCH[3]}"
    printf 'v%s.%s.%s\n' "$major" "$minor" "$((patch + 1))"
    return 0
  fi

  return 1
}

default_tag=""
if [[ -n "$latest_tag" ]]; then
  if suggested="$(suggest_next_patch_tag "$latest_tag")"; then
    default_tag="$suggested"
  fi
fi

echo "Recent tags:"
if git tag --sort=-creatordate | head -10 | sed 's/^/  - /'; then
  :
else
  echo "  (no tags yet)"
fi

echo
echo "Current branch: ${current_branch}"
echo "HEAD:           ${head_sha}"
if [[ -n "$latest_tag" ]]; then
  echo "Latest tag:     ${latest_tag}"
fi
if [[ -n "$default_tag" ]]; then
  echo "Suggested tag:  ${default_tag}"
fi

if [[ -n "$working_tree_state" ]]; then
  echo
  echo "Warning: working tree is not clean."
  git status --short
fi

echo
if [[ -n "$default_tag" ]]; then
  read -r -p "New tag name [${default_tag}]: " TAG_NAME
  TAG_NAME="${TAG_NAME:-$default_tag}"
else
  read -r -p "New tag name (for example v0.3.2): " TAG_NAME
fi

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
  git push origin "$current_branch"
  git push origin --tags
  echo "Pushed branch '$current_branch' and all tags."
  exit 0
fi

read -r -p "Push only tag '$TAG_NAME' now? [y/N] " CONFIRM_PUSH_TAG
if [[ "$CONFIRM_PUSH_TAG" =~ ^[Yy]$ ]]; then
  git push origin "$TAG_NAME"
  echo "Pushed tag '$TAG_NAME'."
  exit 0
fi

echo "Tag created locally only."
