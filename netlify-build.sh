#!/bin/bash

# Cập nhật và cài đặt libimobiledevice-utils
apt-get update
apt-get install -y libimobiledevice-utils

# Cài đặt Homebrew và các công cụ cần thiết
brew install atool

# Tải xuống và cài đặt ipatool
git clone https://github.com/majd/ipatool.git
cd ipatool
make install
cd ..

# Chạy Hugo build
hugo --gc --minify