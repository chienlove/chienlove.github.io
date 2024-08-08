#!/bin/bash

# Chạy Hugo build
hugo --gc --minify

# Cài đặt ipatool qua Homebrew
brew tap majd/repo
brew install ipatool