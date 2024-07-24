const { Octokit } = require('@octokit/rest');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = 'chienlove';
    const repo = 'chienlove.github.io';

    try {
        const formData = JSON.parse(event.body);
        const { releaseType, releaseName, releaseTag, releaseNotes, existingRelease, file } = formData;

        let release;
        if (releaseType === 'new') {
            release = await octokit.repos.createRelease({
                owner,
                repo,
                tag_name: releaseTag,
                name: releaseName,
                body: releaseNotes
            });
        } else {
            release = await octokit.repos.getRelease({ owner, repo, release_id: existingRelease });
        }

        const uploadUrl = release.data.upload_url.replace(/\{.*\}$/, '');
        const uploadResponse = await fetch(`${uploadUrl}?name=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Content-Type': file.type,
                'Content-Length': file.size.toString()
            },
            body: Buffer.from(file.content, 'base64')
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'File uploaded successfully to GitHub Release' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};