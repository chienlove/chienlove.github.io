const { exec } = require('child_process');

exports.handler = async (event) => {
    const { appleId, password, appUrl } = JSON.parse(event.body);

    const command = `ipatool auth login -e ${appleId} -p ${password} && ipatool purchase ${appUrl}`;

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                reject({ statusCode: 500, body: JSON.stringify({ message: 'Failed to download app' }) });
            } else {
                resolve({ statusCode: 200, body: JSON.stringify({ message: 'App added to your purchased list' }) });
            }
        });
    });
};