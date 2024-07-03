const { Octokit } = require("@octokit/rest");

exports.handler = async function(event, context) {
    if (!context.clientContext.user) {
        return { statusCode: 401, body: 'Unauthorized' };
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    try {
        const { data } = await octokit.repos.getContent({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: '_posts'
        });

        const posts = data
            .filter(file => file.name.endsWith('.md'))
            .map(file => ({
                title: file.name.replace(/^\d{4}-\d{2}-\