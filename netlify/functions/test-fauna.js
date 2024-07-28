const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
})

exports.handler = async (event) => {
  try {
    const result = await client.query(
      q.Map(
        q.Paginate(q.Documents(q.Collection('links'))),
        q.Lambda(x => q.Get(x))
      )
    )
    return {
      statusCode: 200,
      body: JSON.stringify(result, null, 2)
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Không thể kết nối đến FaunaDB' })
    }
  }
}