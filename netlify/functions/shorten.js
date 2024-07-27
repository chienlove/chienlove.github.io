const { NetlifyGraph } = require('@netlify/functions')
const { v4: uuidv4 } = require('uuid')

exports.handler = NetlifyGraph.wrapHandler(async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { url } = JSON.parse(event.body)
    const shortId = uuidv4().substr(0, 8)
    const shortUrl = `${process.env.URL}/${shortId}`

    // Lưu mapping vào Netlify KV Store
    await NetlifyGraph.storeValue({
      key: shortId,
      value: url
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ shortUrl })
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() }
  }
}, {
  onError: (error) => {
    console.error(error)
    return { statusCode: 500, body: 'Error shortening URL' }
  }
})