const { Octokit } = require('@octokit/rest');

exports.handler = async (event, context) => {
  try {
    const { file, existing_release, release_tag, release_name, release_notes } = JSON.parse(event.body);
    
    // Get GitHub token from environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: githubToken });
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
    const buffer = Buffer.from(file.content, 'base64');

    const uploadResponse = await octokit.repos.uploadReleaseAsset({
      url: uploadUrl,
      headers: {
        'content-type': file.type,
        'content-length': buffer.length
      },
      name: file.name,
      data: buffer
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        browser_download_url: uploadResponse.data.browser_download_url
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};