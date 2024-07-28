const faunadb = require('faunadb');

const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
});

exports.handler = async (event) => {
  try {
    let url;
    try {
      ({ url } = JSON.parse(event.body));
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    if (!isValidUrl(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid URL' })
      };
    }

    let shortId;
    let exists;
    do {
      shortId = generateShortId();
      exists = await client.query(
        q.Exists(q.Match(q.Index('url_by_short_id'), shortId))
      );
    } while (exists);

    await client.query(
      q.Create(q.Collection('links'), {
        data: { url, shortId }
      })
    );

    const siteUrl = process.env.SITE_URL || 'http://localhost:8888';

    return {
      statusCode: 200,
      body: JSON.stringify({ shortUrl: `${siteUrl}/${shortId}` })
    };
  } catch (error) {
    console.error('Detailed error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};

function generateShortId() {
  return Math.random().toString(36).substr(2, 8);
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
