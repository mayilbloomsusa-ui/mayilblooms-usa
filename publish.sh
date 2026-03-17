#!/bin/bash

# --- MAYIL BLOOMS AUTO-PUBLISH SCRIPT ---
echo "🔍 Step 1: Scanning images and updating product list..."
node update-products.js

# Ensure identity and SSH command are set locally for this project
git config --local user.name "Mayil blooms"
git config --local user.email "mayilbloomsusa@gmail.com"
git config --local core.sshCommand "ssh -i ~/.ssh/mayilblooms -o IdentitiesOnly=yes"

# Step 2: Handle local changes
if [[ -n $(git status -s) ]]; then
    echo "📦 Preparing local changes..."
    git add .
    COMMIT_MSG="Catalog Update: $(date +'%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
else
    echo "ℹ️ No uncommitted changes found. Checking for unpushed commits..."
fi

echo "🚀 Step 3: Pushing to live website (GitHub Pages)..."
if git push origin main; then
    echo "✨ DONE! Your website is being updated."
    echo "🔗 View it here: https://mayilbloomsusa-ui.github.io/mayilblooms-usa/"
else
    echo "❌ ERROR: Push failed. Please check your repository permissions or internet connection."
    exit 1
fi
