const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const FormData = require('form-data');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const { release_tag, release_name, release_notes, existing_release } = JSON.parse(event.body);
        const file = event.body.file;

        if (!file || !file.content || !file.name) {
            throw new Error('Invalid file data');
        }

        const owner = 'chienlove';
        const repo = 'chienlove.github.io';

        let release;
        if (existing_release) {
            release = await octokit.repos.getReleaseByTag({ owner, repo, tag: existing_release });
        } else {
            try {
                release = await octokit.repos.getReleaseByTag({ owner, repo, tag: release_tag });
            } catch (error) {
                if (error.status === 404) {
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

        const uploadUrl = release.data.upload_url.replace(/\{.*\}$/, '');
        
        const form = new FormData();
        form.append('file', Buffer.from(file.content, 'base64'), file.name);

        const uploadResponse = await fetch(`${uploadUrl}?name=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`
            },
            body: form
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Upload thành công!',
                file_url: uploadResult.browser_download_url
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal Server Error' })
        };
    }
};