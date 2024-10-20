const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  onPreBuild: ({ utils }) => {
    const binPath = path.join(__dirname, '..', '..', '..', 'bin');
    if (!fs.existsSync(binPath)) {
      fs.mkdirSync(binPath, { recursive: true });
    }
    const ipatoolPath = path.join(binPath, 'ipatool');
    execSync(`curl -L https://github.com/majd/ipatool/releases/download/v2.1.1/ipatool-linux-amd64 -o ${ipatoolPath}`);
    execSync(`chmod +x ${ipatoolPath}`);
    utils.status.success('ipatool downloaded successfully');
  }
};