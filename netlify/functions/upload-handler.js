const fetch = require('node-fetch');
const FormData = require('form-data');
const { Buffer } = require('buffer');

exports.handler = async function(event) {
    try {
        const { file, existing_release, release_tag, release_name, release_notes } = JSON.parse(event.body);
        const token = process.env.GITHUB_TOKEN;

        if (!token) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'GITHUB_TOKEN is not defined' })
            };
        }

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
                const error = await createReleaseResponse.json();
                throw new Error(`Failed to create release: ${error.message}`);
            }

            const release = await createReleaseResponse.json();
            releaseId = release.id;
        }

        // Tải tệp lên GitHub Releases
        const uploadUrl = `https://uploads.github.com/repos/chienlove/chienlove.github.io/releases/${releaseId}/assets?name=${encodeURIComponent(file.name)}`;
        
        const form = new FormData();
        form.append('file', Buffer.from(file.content, 'base64'), {
            filename: file.name,
            contentType: file.type
        });

        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                ...form.getHeaders()
            },
            body: form
        });

        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(`Failed to upload file: ${error.message}`);
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