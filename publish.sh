#!/bin/bash

# --- MAYIL BLOOMS AUTO-PUBLISH SCRIPT ---
# This script updates the product list from your images folder
# and pushes everything to your live website.

echo "🔍 Step 1: Scanning images and updating product list..."
node update-products.js

# Check if there are any changes
if [[ -z $(git status -s) ]]; then
    echo "✅ No new images or changes found. Your website is already up to date!"
    exit 0
fi

echo "📦 Step 2: Preparing changes..."
git add .

# Create a commit message with the current date and time
COMMIT_MSG="Catalog Update: $(date +'%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG"

echo "🚀 Step 3: Pushing to live website (GitHub Pages)..."
git push origin main

echo "✨ DONE! Your website is being updated."
echo "🔗 View it here: https://elumalai25.github.io/mayilblooms-usa/"
