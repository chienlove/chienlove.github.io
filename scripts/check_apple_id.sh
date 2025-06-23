#!/bin/bash
set -e

EMAIL="$1"
PASSWORD="$2"
VERSION="2.2.0"
TARBALL="ipatool-$VERSION-linux-amd64.tar.gz"
DOWNLOAD_URL="https://github.com/majd/ipatool/releases/download/v$VERSION/$TARBALL"
SESSION_FILE="$HOME/.config/ipatool/session.json"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "❌ Missing Apple ID or password"
  exit 1
fi

# === Download ipatool
if [[ ! -f "./ipatool" ]]; then
  echo "⬇️ Downloading ipatool $VERSION..."
  curl -sSL -o "$TARBALL" "$DOWNLOAD_URL"
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

# === Clean any previous session
rm -f "$SESSION_FILE"

# === Login
echo "🔐 Logging in..."
LOGIN_OUTPUT=$(./ipatool auth login --email "$EMAIL" --password "$PASSWORD" --non-interactive 2>&1 || true)
echo "$LOGIN_OUTPUT"

# === Handle result
if echo "$LOGIN_OUTPUT" | grep -iq "signed in successfully"; then
  echo "✅ Login successful (2FA not enabled)"
  exit 0
elif echo "$LOGIN_OUTPUT" | grep -iq "2FA code is required"; then
  echo "🔐 2FA required. Verifying session file..."

  if [[ -f "$SESSION_FILE" ]]; then
    echo "🔐 Apple ID is valid and requires 2FA."
    exit 0
  else
    echo "❌ Invalid Apple ID or password (no session saved)."
    exit 1
  fi
elif echo "$LOGIN_OUTPUT" | grep -iq "invalid credentials"; then
  echo "❌ Invalid Apple ID or password."
  exit 1
else
  echo "❓ Unknown response:"
  echo "$LOGIN_OUTPUT"
  exit 1
fi