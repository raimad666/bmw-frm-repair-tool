#!/bin/bash

echo "Building BMW FRM Repair Tool..."

# Build frontend
echo "Building frontend..."
cd client
npx vite build --outDir ../dist/public
cd ..

# Build backend  
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build complete! Frontend: dist/public, Backend: dist/index.js"