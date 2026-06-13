#!/bin/bash
# Jarvis launcher — starts Vite dev server then Electron

cd "$(dirname "$0")"

# Kill any leftover processes on common Vite ports
for port in 5173 5174 5175 5176 5177; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done

echo "Starting Jarvis..."

# Start Vite and capture the port it binds to
npm run dev &
VITE_PID=$!

# Wait for Vite to be ready (poll up to 15s)
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
  exit 1
fi

echo "Vite running on port $VITE_PORT — launching Electron..."

# Launch Electron with the detected port
VITE_PORT=$VITE_PORT NODE_ENV=development npx electron electron/main.cjs

# When Electron closes, kill Vite too
kill $VITE_PID 2>/dev/null
