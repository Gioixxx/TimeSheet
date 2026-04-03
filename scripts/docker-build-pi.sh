#!/usr/bin/env bash
set -euo pipefail
# Build a linux/arm64 image for Raspberry Pi 5 (or run this script on the Pi for a native build).

cd "$(dirname "$0")/.."

if [[ "$(uname -m)" == "aarch64" ]] || [[ "$(uname -m)" == "arm64" ]]; then
  echo "Native ARM64 — building locally..."
  docker build -t timesheet .
else
  echo "Cross-building for linux/arm64 (requires Docker Buildx)..."
  docker buildx build --platform linux/arm64 -t timesheet --load .
fi

echo "Done. Run: docker compose up -d"
