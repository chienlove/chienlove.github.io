// /.netlify/functions/upload-to-github.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    try {
        const { file, existing_release, release_tag, release_name, release_notes } = JSON.parse(event.body);
        const token = process.env.GITHUB_TOKEN;

        // Tạo release nếu chưa có
        let releaseId = existing_release;
        if (!existing_release) {
            const createReleaseResponse = await fetch('https://api.github.com/repos/chienlove/chienlove.github.io/releases', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag_name: release_tag,
                    name: release_name,
                    body: release_notes
                })
            });

            if (!createReleaseResponse.ok) {
                throw new Error('Failed to create release');
            }

            const release = await createReleaseResponse.json();
            releaseId = release.id;
        }

        // Tải tệp lên GitHub Releases
        const uploadUrl = `https://uploads.github.com/repos/chienlove/chienlove.github.io/releases/${releaseId}/assets?name=${encodeURIComponent(file.name)}`;
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': file.type
            },
            body: Buffer.from(file.content, 'base64')
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file');
        }

        const result = await uploadResponse.json();

        return {
            statusCode: 200,
            body: JSON.stringify({ browser_download_url: result.browser_download_url })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};