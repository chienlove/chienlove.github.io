// ... (phần code khác giữ nguyên)

exports.handler = async (event) => {
  const { url } = JSON.parse(event.body)
  const shortId = shortid.generate()

  try {
    await client.query(
      q.Create(
        q.Collection('links'),
        { data: { url, shortId } }
      )
    )

    const shortUrl = `${process.env.URL}/${shortId}`

    return {
      statusCode: 200,
      body: JSON.stringify({ shortUrl })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Không thể tạo link rút gọn' })
    }
  }
}