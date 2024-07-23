const { Octokit } = require('@octokit/rest');

exports.handler = async (event, context) => {
    try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const releases = await octokit.repos.listReleases({
            owner: 'YOUR_GITHUB_USERNAME',
            repo: 'YOUR_REPO_NAME'
        });

        return {
            statusCode: 200,
            body: JSON.stringify(releases.data)
        };
    } catch (error) {
        console.error('Error in Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};