const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
})

exports.handler = async (event) => {
  try {
    const { url } = JSON.parse(event.body)
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' })
      }
    }

    const shortId = generateShortId()
    const response = await client.query(
      q.Create(q.Collection('links'), {
        data: { url, shortId }
      })
    )

    const siteUrl = process.env.SITE_URL || 'http://localhost:8888' // Sử dụng URL cục bộ nếu biến môi trường không có

    return {
      statusCode: 200,
      body: JSON.stringify({ shortUrl: `${siteUrl}/.netlify/functions/redirect/${shortId}` })
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}

function generateShortId() {
  return Math.random().toString(36).substr(2, 8)
}