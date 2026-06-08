#!/bin/bash

# --- MAYIL BLOOMS AUTO-PUBLISH SCRIPT ---
echo "🔍 Step 1: Scanning images and updating product list..."
node update-products.js

# GitHub Pages legacy fallback (when Pages serves from branch root):
# config.js and env.js must live at repo root with absolute / paths.
cp public/config.js config.js
cat > env.js << 'EOF'
window.ENV = { API_URL: "https://mayilblooms.work.gd/api" };
EOF

# Ensure identity and SSH command are set locally for this project
git config --local user.name "Mayil blooms"
git config --local user.email "mayilbloomsusa@gmail.com"
git config --local core.sshCommand "ssh -i ~/.ssh/mayilblooms -o IdentitiesOnly=yes"

# Step 2: Handle local changes
if [[ -n $(git status -s) ]]; then
    echo "📦 Preparing local changes..."
    git add .
    git add -f config.js env.js 2>/dev/null || true
    COMMIT_MSG="Catalog Update: $(date +'%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
else
    echo "ℹ️ No uncommitted changes found. Checking for unpushed commits..."
fi

echo "🚀 Step 3: Pushing to live website (GitHub Pages)..."
if git push origin main; then
    echo "✨ DONE! GitHub Actions will build and deploy to Pages."
    echo "🔗 GitHub Pages: https://mayilbloomsusa-ui.github.io/mayilblooms-usa/"
    echo "🔗 Oracle Cloud:  https://mayilblooms.work.gd/"
    echo ""
    echo "ℹ️  In repo Settings → Pages, set Source to \"GitHub Actions\" (one-time)."
else
    echo "❌ ERROR: Push failed. Please check your repository permissions or internet connection."
    exit 1
fi
