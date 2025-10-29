#!/bin/bash

echo "🚀 Building frontend for production..."
cd frontend
npm install
npm run build

echo "✅ Build completed!"
echo ""
echo "📦 Deployment options:"
echo ""
echo "1. Vercel (Recommended):"
echo "   - Install: npm i -g vercel"
echo "   - Deploy: vercel --prod"
echo "   - Or connect GitHub repo at: https://vercel.com"
echo ""
echo "2. GitHub Pages:"
echo "   - Push to GitHub"
echo "   - Go to Settings > Pages"
echo "   - Select 'frontend/dist' as source"
echo ""
echo "3. Netlify:"
echo "   - Drag & drop 'frontend/dist' folder to https://app.netlify.com"
echo "   - Or connect GitHub repo"
echo ""
echo "Built files are in: frontend/dist"
