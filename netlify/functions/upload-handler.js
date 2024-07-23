const fetch = require('node-fetch');
const FormData = require('form-data');
const { Octokit } = require('@octokit/rest');

exports.handler = async (event, context) => {
    try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const { file, release_tag, release_name, release_notes, existing_release } = JSON.parse(event.body);

        console.log('Received data:', { file, release_tag, release_name, release_notes, existing_release });

        let release;
        if (existing_release) {
            // Use existing release
            release = await octokit.repos.getReleaseByTag({
                owner: 'chienlove',
                repo: 'chienlove.github.io',
                tag: existing_release
            });
            console.log('Existing release:', release.data);
        } else {
            // Check if release exists
            try {
                release = await octokit.repos.getReleaseByTag({
                    owner: 'chienlove',
                    repo: 'chienlove.github.io',
                    tag: release_tag
                });
                console.log('Found release:', release.data);
            } catch (error) {
                if (error.status === 404) {
                    // Create a new release if not found
                    release = await octokit.repos.createRelease({
                        owner: 'chienlove',
                        repo: 'chienlove.github.io',
                        tag_name: release_tag,
                        name: release_name,
                        body: release_notes
                    });
                    console.log('Created new release:', release.data);
                } else {
                    console.error('Error checking release:', error);
                    throw error;
                }
            }
        }

        const uploadUrl = release.data.upload_url;

        // Upload the file
        const form = new FormData();
        form.append('file', file.buffer, file.originalname);

        console.log('Uploading to URL:', `${uploadUrl}?name=${encodeURIComponent(file.originalname)}`);

        const uploadResponse = await fetch(`${uploadUrl}?name=${encodeURIComponent(file.originalname)}`, {
            method: 'POST',
            headers: {
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
                ...form.getHeaders()
            },
            body: form
        });

        if (!uploadResponse.ok) {
            const errorResponse = await uploadResponse.text();
            console.error('Error response from GitHub:', errorResponse);
            return {
                statusCode: uploadResponse.status,
                body: JSON.stringify({ error: errorResponse })
            };
        }

        const uploadResult = await uploadResponse.json();
        console.log('Upload result:', uploadResult);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Upload thành công!', file_url: uploadResult.browser_download_url })
        };
    } catch (error) {
        console.error('Error in Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};