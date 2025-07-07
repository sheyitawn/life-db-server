const admin = require('firebase-admin');
const serviceAccount = require('./firebaseKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://lifedb-9c46d-default-rtdb.europe-west1.firebasedatabase.app/'
});

const db = admin.database();

module.exports = db;
