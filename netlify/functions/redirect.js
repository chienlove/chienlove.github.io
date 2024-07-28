const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
})

exports.handler = async (event) => {
  const { shortId } = event.queryStringParameters

  try {
    const response = await client.query(
      q.Get(q.Match(q.Index('url_by_short_id'), shortId))
    )

    return {
      statusCode: 301,
      headers: {
        Location: response.data.url
      }
    }
  } catch (error) {
    return {
      statusCode: 404,
      body: 'Link không tồn tại'
    }
  }
}