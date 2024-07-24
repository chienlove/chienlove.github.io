const { Octokit } = require('@octokit/rest');

exports.handler = async (event, context) => {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = 'chienlove';
    const repo = 'chienlove.github.io';

    try {
        const releases = await octokit.repos.listReleases({ owner, repo });
        return {
            statusCode: 200,
            body: JSON.stringify(releases.data.map(release => ({ id: release.id, name: release.name })))
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};