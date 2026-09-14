#!/bin/bash
cd "$(dirname "$0")"
if [ -z "$1" ]; then
  echo "Drag a project folder onto this file."
  echo "Or: node to-desktop.mjs /path/to/app"
  read -r _
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js from https://nodejs.org then try again."
  read -r _
  exit 1
fi
if [ ! -d "node_modules/@electron/packager" ]; then
  echo "Installing converter once…"
  npm install
fi
node to-desktop.mjs "$@"
echo
read -r _
