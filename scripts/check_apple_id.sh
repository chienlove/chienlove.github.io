#!/bin/bash
set -e

EMAIL="$1"
PASSWORD="$2"
VERSION="2.2.0"
TARBALL="ipatool-$VERSION-linux-amd64.tar.gz"
DOWNLOAD_URL="https://github.com/majd/ipatool/releases/download/v$VERSION/$TARBALL"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "❌ Missing Apple ID or password"
  exit 1
fi

# === DOWNLOAD IPATOOL ===
if [[ ! -f "./ipatool" ]]; then
  echo "⬇️ Downloading ipatool v$VERSION..."
  curl -L -o "$TARBALL" "$DOWNLOAD_URL"
  tar -xzf "$TARBALL"
  
  # ✅ Đúng đường dẫn thực thi
  cp "./bin/ipatool-$VERSION-linux-amd64" ./ipatool
  chmod +x ipatool

  # 🧹 Dọn dẹp
  rm -rf "$TARBALL" bin/
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