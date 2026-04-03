#!/usr/bin/env bash
set -euo pipefail

echo "Timesheet — Raspberry Pi OS / Debian: Docker Engine setup"
echo ""

if command -v docker >/dev/null 2>&1; then
  echo "Docker is already installed: $(docker --version)"
  exit 0
fi

if [[ "${EUID:-0}" -eq 0 ]]; then
  curl -fsSL https://get.docker.com | sh
else
  echo "This script will run Docker's install via sudo."
  curl -fsSL https://get.docker.com | sudo sh
fi

if [[ "${EUID:-0}" -ne 0 ]] && id -nG "$USER" | grep -qw docker; then
  echo "User is already in the docker group."
else
  if [[ "${EUID:-0}" -ne 0 ]]; then
    sudo usermod -aG docker "$USER" || true
    echo ""
    echo "Added $USER to group 'docker'. Log out and log back in (or run: newgrp docker)"
    echo "before using Docker without sudo."
  fi
fi

docker --version
