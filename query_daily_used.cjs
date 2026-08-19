const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const q = collection(db, "appData");
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.dailyUsedLastFmAccounts) {
        console.log("Daily used 2026-08-18:", data.dailyUsedLastFmAccounts['2026-08-18']);
        console.log("Daily used 2026-08-19:", data.dailyUsedLastFmAccounts['2026-08-19']);
    }
  });
  process.exit(0);
}
run().catch(console.error);
