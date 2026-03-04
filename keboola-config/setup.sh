#!/bin/bash
set -Eeuo pipefail

echo "Installing dependencies and building..."
cd /app
npm install --include=dev
npm run build
echo "Setup complete."
