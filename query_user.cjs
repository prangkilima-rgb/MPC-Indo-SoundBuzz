const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('firebase-service-account.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const snapshot = await db.collection('users').where('email', '==', 'prangkilima@gmail.com').get();
  if (snapshot.empty) {
    console.log('No user found.');
    return;
  }
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(JSON.stringify(data.checkInHistory, null, 2));
  });
}
run().catch(console.error);
