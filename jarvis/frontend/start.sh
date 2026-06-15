#!/bin/bash
# Jarvis launcher — starts backend (if configured), Vite, then Electron

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"
cd "$SCRIPT_DIR"

# Kill leftover processes on common Vite ports
for port in 5173 5174 5175 5176 5177; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done

# Try to start backend if .env exists
if [ -f "$BACKEND_DIR/.env" ]; then
  echo "Starting Jarvis backend..."
  cd "$BACKEND_DIR" && npm install --silent && node server.js &
  BACKEND_PID=$!
  cd "$SCRIPT_DIR"
  sleep 2
  echo "Backend started (PID $BACKEND_PID)"
else
  echo "No backend .env found — skipping backend (voice UI still works)"
fi

echo "Starting Vite..."
npm run dev &
VITE_PID=$!

# Wait for Vite to be ready
VITE_PORT=""
for i in $(seq 1 30); do
  sleep 0.5
  for port in 5173 5174 5175 5176 5177; do
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
      VITE_PORT=$port
      break 2
    fi
  done
done

if [ -z "$VITE_PORT" ]; then
  echo "ERROR: Vite failed to start"
  kill $VITE_PID 2>/dev/null
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

echo "Vite on port $VITE_PORT — launching Electron..."
VITE_PORT=$VITE_PORT NODE_ENV=development npx electron electron/main.cjs

# Cleanup on exit
kill $VITE_PID 2>/dev/null
kill $BACKEND_PID 2>/dev/null
