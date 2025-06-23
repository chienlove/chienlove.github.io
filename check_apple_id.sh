#!/bin/bash
set -e

EMAIL="$1"
PASSWORD="$2"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "❌ Missing Apple ID or password"
  exit 1
fi

# === DOWNLOAD IPATOOL ===
VERSION="2.2.0"
URL="https://github.com/majd/ipatool/releases/download/v2.2.0/ipatool-2.2.0-linux-amd64.tar.gz"

if [[ ! -f "./ipatool" ]]; then
  echo "⬇️ Downloading ipatool v$VERSION..."
  curl -L -o ipatool.tar.gz "$URL"
  tar -xzf ipatool.tar.gz
  chmod +x ipatool
  rm ipatool.tar.gz
fi

# === LOGIN ===
echo "🔐 Logging in to Apple ID..."
RESULT=$(./ipatool login -u "$EMAIL" -p "$PASSWORD" --json || true)

echo "$RESULT" > result.json

STATE=$(jq -r '.state' result.json)
DSID=$(jq -r '.session?.account?.dsPersonId // empty' result.json)
AUTH_TYPE=$(jq -r '.authType // empty' result.json)
ERROR_MSG=$(jq -r '.errorMessage // empty' result.json)

# === CHECK RESULT ===
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