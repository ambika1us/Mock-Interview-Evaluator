#!/bin/bash
# Starts the backend API and the frontend dev server.
# The frontend (port 5173) is the exposed port and reverse-proxies /api to the backend.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start backend API in the background
(cd "$ROOT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

# Make sure the backend is stopped when this script exits
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM

# Start frontend dev server in the foreground (exposed preview port)
cd "$ROOT_DIR/frontend"
npm run dev
