const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');

exports.handler = async (event, context) => {
    // Kiểm tra phương thức HTTP
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const { file, release_tag, release_name, release_notes, existing_release } = JSON.parse(event.body);

        console.log('Received data:', { release_tag, release_name, existing_release });

        // Kiểm tra dữ liệu đầu vào
        if (!file || !file.content || !file.name) {
            throw new Error('Invalid file data');
        }

        const owner = 'chienlove';
        const repo = 'chienlove.github.io';

        let release;
        if (existing_release) {
            console.log(`Using existing release: ${existing_release}`);
            release = await octokit.repos.getReleaseByTag({ owner, repo, tag: existing_release });
        } else {
            try {
                console.log(`Checking for existing release: ${release_tag}`);
                release = await octokit.repos.getReleaseByTag({ owner, repo, tag: release_tag });
            } catch (error) {
                if (error.status === 404) {
                    console.log(`Creating new release: ${release_tag}`);
                    release = await octokit.repos.createRelease({
                        owner,
                        repo,
                        tag_name: release_tag,
                        name: release_name,
                        body: release_notes
                    });
                } else {
                    throw error;
                }
            }
        }

        console.log('Release data:', release.data);

        // Upload file
        const fileBuffer = Buffer.from(file.content, 'base64');
        const uploadUrl = release.data.upload_url.replace(/\{.*\}$/, '');

        console.log(`Uploading file: ${file.name} to ${uploadUrl}`);
        const uploadResponse = await fetch(`${uploadUrl}?name=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Content-Type': 'application/octet-stream'
            },
            body: fileBuffer
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload error:', uploadResponse.status, errorText);
            throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('Upload successful:', uploadResult);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Upload thành công!',
                file_url: uploadResult.browser_download_url
            })
        };
    } catch (error) {
        console.error('Error in Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal Server Error' })
        };
    }
};