#!/bin/bash
# Installation script for bing-search-mcp

cd "$(dirname "$0")"

echo "Cleaning up old puppeteer installation..."
rm -rf node_modules/puppeteer node_modules/@puppeteer

echo "Installing dependencies (including puppeteer-core)..."
npm install

echo "Building the project..."
npm run build

echo "Done! You can now use bing-search-mcp."
