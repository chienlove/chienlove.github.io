#!/bin/bash
set -e

EMAIL="$1"
PASSWORD="$2"
VERSION="2.2.0"
FILENAME="ipatool-$VERSION-linux-amd64"
TARBALL="$FILENAME.tar.gz"
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

  # ✅ Lấy đúng tên file trong bin/ (dù tên là gì)
  BIN_PATH=$(find "$FILENAME/bin" -type f -name "ipatool*" | head -n 1)
  if [[ ! -f "$BIN_PATH" ]]; then
    echo "❌ Cannot find ipatool binary in extracted folder."
    exit 1
  fi

  cp "$BIN_PATH" ./ipatool
  chmod +x ipatool
  rm -rf "$TARBALL" "$FILENAME"
fi

# === Run signin
echo "🔐 Signing in..."
OUTPUT=$(./ipatool auth signin --username "$EMAIL" --password "$PASSWORD" 2>&1 || true)

echo "$OUTPUT"

# === Check result
if echo "$OUTPUT" | grep -iq "Two-factor authentication is enabled"; then
  echo "🔐 Apple ID requires 2FA."
  exit 0
elif echo "$OUTPUT" | grep -iq "Invalid credentials"; then
  echo "❌ Invalid Apple ID or password."
  exit 1
elif echo "$OUTPUT" | grep -iq "Signed in successfully"; then
  echo "✅ Login successful (2FA not enabled)."
  exit 0
else
  echo "❓ Unknown response:"
  echo "$OUTPUT"
  exit 1
fi