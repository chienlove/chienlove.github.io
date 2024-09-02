const admin = require('firebase-admin');
const functions = require('@netlify/functions');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://https://admin-panel-7418d-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

exports.handler = async (event) => {
  const query = event.queryStringParameters.q;
  let searchResults = [];

  if (query) {
    const snapshot = await db.collection('posts').where('content', 'array-contains', query).get();
    snapshot.forEach(doc => {
      searchResults.push(doc.data());
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify(searchResults),
  };
};