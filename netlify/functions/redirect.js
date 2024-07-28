const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
})

exports.handler = async (event) => {
  const shortId = event.path.split('/').pop()

  if (!shortId) {
    return {
      statusCode: 400,
      body: 'Invalid short link'
    }
  }

  try {
    const response = await client.query(
      q.Get(q.Match(q.Index('url_by_short_id'), shortId))
    )

    if (!response.data.url) {
      throw new Error('URL not found')
    }

    return {
      statusCode: 301,
      headers: {
        Location: response.data.url
      }
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 404,
      body: 'Link không tồn tại'
    }
  }
}