const { Octokit } = require("@octokit/rest");
const { Base64 } = require('js-base64');

exports.handler = async function(event, context) {
    if (!context.clientContext.user) {
        return { statusCode: 401, body: 'Unauthorized' };
    }

    const { title, body, date } = JSON.parse(event.body);

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    const content = `---
title: ${title}
date: ${date}
---
${body}`;

    try {
        await octokit.repos.createOrUpdateFileContents({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: `_posts/${date.split('T')[0]}-${title.toLowerCase().replace(/\s+/g, '-')}.md`,
            message: `Create post ${title}`,
            content: Base64.encode(content),
            branch: 'main'
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Post created successfully' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error creating post' })
        };
    }
};