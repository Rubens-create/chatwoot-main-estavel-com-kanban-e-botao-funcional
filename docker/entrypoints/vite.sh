#!/bin/sh
apk add --update nodejs npm
npm install -g pnpm
set -x

rm -rf /app/tmp/pids/server.pid
rm -rf /app/tmp/cache/*

pnpm store prune
pnpm install --force

echo "Ready to run Vite development server."

exec "$@"
