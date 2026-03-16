#!/bin/bash

# Victus OTA Update Manager
echo "==================================="
echo "🚀 Victus Auto-Update Manager"
echo "==================================="

# Ask for the update message
read -p "Enter update description (e.g., 'fixed water ui'): " UPDATE_MSG

if [ -z "$UPDATE_MSG" ]; then
  echo "❌ Error: Update message cannot be empty."
  exit 1
fi

echo "📦 Bundling and pushing update to EAS..."

# Push the update to the 'preview' branch
eas update --branch preview --message "$UPDATE_MSG"

echo "✅ Update successfully published!"
echo "Next time you open Victus on your phone, it will download '$UPDATE_MSG'."
