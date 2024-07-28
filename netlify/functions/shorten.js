const faunadb = require('faunadb')
const shortid = require('shortid')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
})

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

    return {
      statusCode: 200,
      body: JSON.stringify({ shortId })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Không thể tạo link rút gọn' })
    }
  }
}