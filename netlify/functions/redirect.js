const { NetlifyGraph } = require('@netlify/functions')

exports.handler = NetlifyGraph.wrapHandler(async (event, context) => {
  const shortId = event.path.split('/').pop()

  try {
    // Lấy URL gốc từ Netlify KV Store
    const originalUrl = await NetlifyGraph.getValue({ key: shortId })

    if (originalUrl) {
      return {
        statusCode: 301,
        headers: {
          Location: originalUrl
        }
      }
    } else {
      return {
        statusCode: 404,
        body: 'Not Found'
      }
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() }
  }
}, {
  onError: (error) => {
    console.error(error)
    return { statusCode: 500, body: 'Error redirecting' }
  }
})