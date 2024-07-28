const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
})

exports.handler = async (event) => {
  const shortId = event.path.split('/').pop()
  console.log('Requested shortId:', shortId)

  if (!shortId) {
    return {
      statusCode: 400,
      body: 'Invalid short link'
    }
  }

  try {
    console.log('Querying FaunaDB for shortId:', shortId)
    const response = await client.query(
      q.Get(q.Match(q.Index('url_by_short_id'), shortId))
    )
    console.log('FaunaDB response:', JSON.stringify(response, null, 2))

    if (!response.data || !response.data.url) {
      console.log('URL not found in response data')
      throw new Error('URL not found')
    }

    console.log('Redirecting to:', response.data.url)
    return {
      statusCode: 301,
      headers: {
        Location: response.data.url
      }
    }
  } catch (error) {
    console.error('Error:', error)
    if (error.name === 'NotFound') {
      return {
        statusCode: 404,
        body: 'Link không tồn tại trong database'
      }
    }
    return {
      statusCode: 500,
      body: 'Lỗi server khi xử lý request'
    }
  }
}