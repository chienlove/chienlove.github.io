const { exec } = require('child_process');

exports.handler = async (event, context) => {
    const { appleId, password, appUrl } = JSON.parse(event.body);

    return new Promise((resolve, reject) => {
        exec(`ipatool purchase --apple-id ${appleId} --password ${password} --app-url ${appUrl}`, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    statusCode: 500,
                    body: JSON.stringify({ message: `Error: ${stderr}` }),
                });
                return;
            }

            resolve({
                statusCode: 200,
                body: JSON.stringify({ message: `Success: ${stdout}` }),
            });
        });
    });
};