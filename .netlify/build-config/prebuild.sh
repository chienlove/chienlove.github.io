#!/bin/bash
# .netlify/build-config/prebuild.sh
# Đặt quyền thực thi cho binary ipatool trong quá trình build
echo "Setting executable permissions for ipatool binaries..."
chmod +x netlify/functions/bin/ipatool
# Nếu bạn có nhiều binary, bạn có thể thêm vào đây
# chmod +x netlify/functions/bin/ipatool-2.1.4-linux-amd64

# Hiển thị thông tin kiểm tra
echo "Checking executable permissions:"
ls -la netlify/functions/bin/
echo "Prebuild script completed."