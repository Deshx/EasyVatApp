#!/bin/bash

# Kill all processes running on ports 3000 to 3009
for port in {3000..3009}; do
  PID=$(lsof -ti tcp:$port)
  if [ ! -z "$PID" ]; then
    echo "Killing process on port $port (PID: $PID)"
    kill -9 $PID
  fi
done

echo "Starting dev server..."
npx next dev 