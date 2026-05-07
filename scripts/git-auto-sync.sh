#!/usr/bin/env bash
set -euo pipefail

remote="${GIT_AUTOPUSH_REMOTE:-origin}"
branch="${GIT_AUTOPUSH_BRANCH:-}"
message="${*:-}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This folder is not a Git repository. Run: git init -b main"
  exit 1
fi

if ! git config user.name >/dev/null || ! git config user.email >/dev/null; then
  echo "Git author identity is missing."
  echo "Set it once with:"
  echo "  git config --global user.name \"Your Name\""
  echo "  git config --global user.email \"you@example.com\""
  exit 1
fi

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "No changes to sync."
  exit 0
fi

git add -A

if [ -z "$message" ]; then
  message="Auto sync $(date '+%Y-%m-%d %H:%M:%S')"
fi

git commit -m "$message"

if ! git remote get-url "$remote" >/dev/null 2>&1; then
  echo "Committed locally, but remote '$remote' is not configured."
  echo "Add your GitHub remote with:"
  echo "  git remote add origin git@github.com:USER/REPO.git"
  exit 1
fi

if [ -z "$branch" ]; then
  branch="$(git branch --show-current)"
fi

if [ -z "$branch" ]; then
  echo "Could not determine the current branch."
  exit 1
fi

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push
else
  git push -u "$remote" "$branch"
fi

echo "Synced '$branch' to '$remote'."
