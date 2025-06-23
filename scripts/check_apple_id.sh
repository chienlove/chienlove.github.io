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

# === Download ipatool
if [[ ! -f "./ipatool" ]]; then
  echo "⬇️ Downloading ipatool $VERSION..."
  curl -L -o "$TARBALL" "$DOWNLOAD_URL"
  tar -xzf "$TARBALL"

  BIN_FILE="bin/ipatool-$VERSION-linux-amd64"
  if [[ ! -f "$BIN_FILE" ]]; then
    echo "❌ Binary not found at $BIN_FILE"
    exit 1
  fi

  cp "$BIN_FILE" ./ipatool
  chmod +x ipatool
  rm -rf "$TARBALL" bin/
fi

# === Show version
echo "ℹ️ ipatool version:"
./ipatool --version

# === Login with correct flags (v2.2.0)
echo "🔐 Logging in..."
OUTPUT=$(./ipatool auth login --email "$EMAIL" --password "$PASSWORD" --non-interactive 2>&1 || true)

echo "$OUTPUT"

# === Parse result
if echo "$OUTPUT" | grep -iq "Two-factor authentication is enabled"; then
  echo "🔐 Apple ID requires 2FA."
  exit 0
elif echo "$OUTPUT" | grep -iq "invalid credentials"; then
  echo "❌ Invalid Apple ID or password."
  exit 1
elif echo "$OUTPUT" | grep -iq "signed in successfully"; then
  echo "✅ Login successful (2FA not enabled)."
  exit 0
else
  echo "❓ Unknown response:"
  echo "$OUTPUT"
  exit 1
fi