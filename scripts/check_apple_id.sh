#!/bin/bash
set -e

EMAIL="$1"
PASSWORD="$2"
VERSION="v1.0.3"
DOWNLOAD_URL="https://github.com/majd/ipatool/releases/download/$VERSION/ipatool"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "❌ Missing Apple ID or password"
  exit 1
fi

# === Download ipatool v1.0.3 (no extract needed)
if [[ ! -f "./ipatool" ]]; then
  echo "⬇️ Downloading ipatool $VERSION..."
  curl -L -o ipatool "$DOWNLOAD_URL"
  chmod +x ipatool
fi

# === Authenticate
echo "🔐 Logging in to Apple ID..."
RESULT=$(./ipatool login -u "$EMAIL" -p "$PASSWORD" --json || true)

echo "$RESULT" > result.json

STATE=$(jq -r '.state' result.json)
DSID=$(jq -r '.session?.account?.dsPersonId // empty' result.json)
AUTH_TYPE=$(jq -r '.authType // empty' result.json)
ERROR_MSG=$(jq -r '.errorMessage // empty' result.json)

# === Handle result
if [[ "$STATE" == "success" && -n "$DSID" ]]; then
  echo "✅ Login successful. dsid=$DSID"
  exit 0
elif [[ "$AUTH_TYPE" == "hsa2" ]]; then
  echo "🔐 2FA required."
  exit 0
elif [[ -n "$ERROR_MSG" ]]; then
  echo "❌ Error: $ERROR_MSG"
  exit 1
else
  echo "❓ Unknown state. Full output:"
  cat result.json
  exit 1
fi